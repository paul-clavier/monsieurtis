# `@monsieurtis/core` — `CommonUseCases`

`CommonUseCases<E, R, F>` is the per-entity façade that exposes the 9 standard
CRUD methods as thin pass-throughs to a `CommonRepository`. A concrete
subclass adds `@Injectable()` and resolves the repository through DI; the
controller layer (see `@monsieurtis/nest-rest-crud`) calls the same 9 methods.

## What you get for free

```ts
useCases.getOne(id, { include: ["author"] });
useCases.getAll({ filters: [{ search: "foo" }], sort: { field: "name", direction: "ASC" } });
useCases.getPage({ pagination: { page: 1, pageSize: 20 } });
useCases.create(data);                    // -> string  (id)
useCases.createMany(data[]);              // -> string[]
useCases.update(id, partial);             // -> string
useCases.updateMany(ids, partial);        // -> string[]
useCases.delete(id);                      // -> string
useCases.deleteMany(ids);                 // -> string[]
```

The semantics, return shape, filter combination rules and relation/include
behaviour are inherited from the underlying `CommonRepository` — see
`@monsieurtis/prisma` docs.

## What a subclass must declare

| Member                    | Purpose                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@Injectable()`           | So Nest can construct it. The base class is framework-free; the decorator goes on the subclass to keep `@monsieurtis/core` Nest-agnostic. |
| Constructor `super(repo)` | Pass in the concrete repository, typed as `CommonRepository<E, R, F>`. Inject through your token (`@Inject(FOO_REPOSITORY)`).             |

Minimal example:

```ts
@Injectable()
export class IngredientUseCases extends CommonUseCases<
    Ingredient,
    Record<string, never>,
    IngredientFilters
> {
    constructor(
        @Inject(INGREDIENT_REPOSITORY)
        repository: CommonRepository<
            Ingredient,
            Record<string, never>,
            IngredientFilters
        >,
    ) {
        super(repository);
    }
}
```

That's the whole file. The 9 methods are inherited.

> **Note** — when the constructor parameter type is referenced from a
> decorated signature with `emitDecoratorMetadata` enabled, import
> `CommonRepository` with `import type` to satisfy `isolatedModules`:
>
> ```ts
> import { CommonUseCases } from "@monsieurtis/core";
> import type { CommonRepository } from "@monsieurtis/core";
> ```

## Splicing in domain logic — override one method

The whole point of grouping the 9 calls into a single class is that **you
override one method when you need extra behaviour, and the other 8 stay
inherited unchanged**. The controller calling these methods is not affected.

### Example 1 — side effect on `create`

You want to publish a notification (or update a cache, call an external API,
…) every time a `Foo` is created. Override `create`, call `super.create(data)`
to get the id back, then run the side effect.

```ts
@Injectable()
export class FooUseCases extends CommonUseCases<
    Foo,
    Record<string, never>,
    FooFilters
> {
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

The other 8 methods (`update`, `delete`, `getPage`, …) are unaffected. The
controller still calls `useCases.create(body)` exactly the same way; the
extra side effect is invisible to it.

The same recipe applies to `createMany`, `update`, `delete`, etc. — override
one, leave the rest. If a side effect must run for both the singular and the
bulk variant, override both and factor a private helper:

```ts
override create(data: MutableFoo) { return this.createWithNotify([data]).then(([id]) => id); }
override createMany(data: MutableFoo[]) { return this.createWithNotify(data); }

private async createWithNotify(data: MutableFoo[]): Promise<string[]> {
    const ids = data.length === 1
        ? [await super.create(data[0])]
        : await super.createMany(data);
    await Promise.all(ids.map((id) => this.notifier.notifyCreated(id)));
    return ids;
}
```

### When to drop out of `CommonUseCases` entirely

If a method needs **multiple repositories**, **cross-entity invariants**, or
a fundamentally different return shape, write a discrete `UseCase<Port,
Result>` class for that operation alongside the `FooUseCases` façade. The 8
non-touching methods stay on the façade; the special operation gets its own
file. Don't try to torture the base class into doing both.

## Tests

Test the override paths in isolation; don't re-test the inherited 8. The
inherited methods are tested once at the `CommonRepository` layer.
