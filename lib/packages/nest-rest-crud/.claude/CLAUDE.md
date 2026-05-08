# `@monsieurtis/nest-rest-crud` — `CommonControllerMixin`

`CommonControllerMixin(opts)` is a factory that returns an abstract NestJS
controller wired with the 9 standard CRUD routes. It pairs with
`CommonUseCases` from `@monsieurtis/core` — the controller calls the use-case
façade, the use-case façade calls a `CommonRepository`.

## Routes

| Method | Path        | Body / Query                               | Returns        |
|--------|-------------|--------------------------------------------|----------------|
| GET    | `/`         | `?filters=…&sort=field:DIR&include=a,b&pagination[page]=1&pagination[pageSize]=20` | array OR `Page<E>` |
| GET    | `/:id`      | `?include=a,b`                             | `E & relations` or 404 |
| POST   | `/`         | `Create` body                              | `{ id }`       |
| POST   | `/bulk`     | `Create[]` body                            | `{ ids }`      |
| PATCH  | `/:id`      | `Update` body                              | `{ id }`       |
| PATCH  | `/`         | `{ ids: string[]; data: Update }`          | `{ ids }`      |
| DELETE | `/:id`      | —                                          | `{ id }`       |
| DELETE | `/`         | `{ ids: string[] }`                        | `{ ids }`      |

`Update` defaults to `Create.partial()` if not supplied. `GET /` returns a
`Page<E>` envelope when `pagination[page]` and `pagination[pageSize]` are both
present, otherwise a plain array.

## Usage

```ts
// presentation/api/internal/ingredient/ingredient.schemas.ts
import { z } from "zod";
export const IngredientCreate  = z.object({ name: z.string().min(1), label: z.string().min(1) });
export const IngredientFilters = z.object({ search: z.string().min(1) });
```

```ts
// presentation/api/internal/ingredient/ingredient.controller.ts
@Controller("ingredients")
export class IngredientController extends CommonControllerMixin<
    Ingredient,
    Record<string, never>,
    typeof IngredientCreate,
    typeof IngredientFilters
>({
    create:      IngredientCreate,
    filters:     IngredientFilters,
    sortFields:  ["name", "label"] as const,
}) {
    constructor(public readonly useCases: IngredientUseCases) { super(); }
}
```

That's the whole controller — 9 routes for free. Subclasses must declare
`useCases` (DI'd `CommonUseCases`) and add the `@Controller("path")`
decorator.

## Factory options

| Option         | Purpose |
|----------------|---------|
| `create`       | Zod schema for `POST /` and `POST /bulk` items. Required. Must be `z.object(...)`. |
| `update`       | Zod schema for `PATCH /:id` and `PATCH /` data. Optional — defaults to `create.partial()`. |
| `filters`      | Zod schema for each filter object in `?filters=…`. |
| `relationKeys` | Allow-list of relation names accepted in `?include=`. Unknown values are dropped. |
| `sortFields`   | Allow-list of sort fields. Unknown values cause the `sort` clause to be dropped. |

The factory wires `ZodValidationPipe` per route automatically — you do not
need to register it globally and you do not need `createZodDto` wrappers.

## Splicing in extras — override one route

You can override any of the 9 routes by re-declaring the matching method on
the subclass. Re-declared methods shadow the inherited one (Nest registers
the most-derived `@Verb('/path')` it finds). Most "extra behaviour" requests
fall under one of two patterns.

### Example 1 — side effect on `create`

Two clean places to put it. Pick by where the side effect lives in the
layering.

**(a) Inside the use-case** (preferred when the side effect is *domain
logic* — the create is incomplete without it):

```ts
@Injectable()
export class FooUseCases extends CommonUseCases<Foo, Record<string, never>, FooFilters> {
    constructor(
        @Inject(FOO_REPOSITORY)
        repository: CommonRepository<Foo, Record<string, never>, FooFilters>,
        private readonly notifier: NotificationClient,
    ) {
        super(repository);
    }

    override async create(data: MutableFoo): Promise<string> {
        const id = await super.create(data);
        await this.notifier.notifyCreated(id);
        return id;
    }
}
```

The controller is **untouched** — every other route still works, and
`POST /foos` now publishes the notification on every successful create.

**(b) Inside the controller** (preferred when the side effect is HTTP-shaped
— audit log entry, custom response header, response envelope change):

```ts
@Controller("foos")
export class FooController extends CommonControllerMixin({...}) {
    constructor(
        public readonly useCases: FooUseCases,
        private readonly audit: AuditService,
    ) { super(); }

    @Post("/")
    override async create(@Body() body: FooCreate) {
        const id = await this.useCases.create(body);
        this.audit.log({ action: "foo.created", id });
        return { id };
    }
}
```

> When you re-declare a route inside the subclass you also re-state the
> `@Verb('/path')` decorator. Body validation still runs because the global
> `ZodValidationPipe` is re-attached by the inherited factory's pipe — but
> if you want explicit per-route validation, attach
> `@Body(new ZodValidationPipe(FooCreate))`.

### Example 2 — `@Permission(...)` on `delete` only

Method decorators applied inside the factory's base class **do not transfer
to a subclass override**: Nest reads metadata from where the route is finally
declared. So if you want to add `@Permission(...)` (or any per-route guard /
decorator) on a single route, **re-declare the route on the subclass** and
restate the verb decorator alongside the new one:

```ts
@Controller("foos")
export class FooController extends CommonControllerMixin({...}) {
    constructor(public readonly useCases: FooUseCases) { super(); }

    @Delete("/:id")
    @Permission("FOOS", ["delete"])
    override async delete(@Param("id") id: string) {
        return super.delete(id);
    }
}
```

The other 8 routes stay untouched — only `DELETE /foos/:id` is now gated by
the permission check.

If **every** route on the controller needs the same guard, apply it at class
level instead — that one *does* propagate:

```ts
@Controller("foos")
@UseGuards(AccessTokenGuard)            // applies to all 9 inherited routes
export class FooController extends CommonControllerMixin({...}) { … }
```

> ⚠️ **Trap to avoid**: do not put `@Permission(...)` on the *base class*
> methods inside the factory and expect subclass overrides to inherit it.
> They won't. The override has its own descriptor with no decorators.

## When to drop out of the mixin

If a route needs a fundamentally different shape (e.g. a search endpoint
returning aggregates, an action endpoint that doesn't fit CRUD), don't twist
the mixin — declare a discrete controller (or extra routes on the subclass).
The 9 inherited routes don't conflict with hand-rolled ones as long as the
paths differ.
