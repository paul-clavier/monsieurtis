# `@monsieurtis/prisma` — Common Repository

`PrismaCommonRepository` is an abstract base class that gives any Prisma model a typed CRUD surface — `getOne`, `getAll`, `getPage`, `create`, `update`, `delete`, and their `*Many` counterparts — with a single, declarative registry mechanism for **relations** (which children/parents can be loaded) and **filters** (which `where` fragments callers may compose).

A concrete repository extends it, provides a couple of fields, and gets the full surface for free.

## What a subclass must declare

| Member                     | Purpose                                                   |
| -------------------------- | --------------------------------------------------------- |
| `protected get delegate()` | Returns `this.prisma.<model>` — the Prisma model delegate |
| `protected mapBase(row)`   | Prisma row → domain entity (no relations)                 |

## What a subclass may declare

| Member                         | Purpose                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| `protected readonly relations` | Catalog of relations callers can request via `include: ["…"]`       |
| `protected readonly filters`   | Catalog of filter callbacks; values plugged in via `filters: { … }` |

## Minimal example — no relations, no filters

```ts
import { PrismaCommonRepository, PrismaService } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

interface Tag {
    id: string;
    name: string;
}

const mapTag = (row: { id: string; name: string }): Tag => row;

@Injectable()
export class PrismaTagRepository extends PrismaCommonRepository<Tag> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.tag;
    }

    protected mapBase = mapTag;
}
```

Inherited surface:

```ts
tagRepo.getOne(id);                                // Tag | null
tagRepo.getAll();                                  // Tag[]
tagRepo.getPage({ pagination: { page: 1, pageSize: 20 } }); // Page<Tag>
tagRepo.create({ name: "..." });                   // string  (id of new row)
tagRepo.update(id, { name: "..." });               // string  (id)
tagRepo.delete(id);                                // string  (id)
tagRepo.createMany([...]);                         // string[]
tagRepo.updateMany(ids, { name: "..." });          // string[]
tagRepo.deleteMany(ids);                           // string[]
```

**Mutations return ids only.** If the caller needs the full entity afterwards, it re-fetches via `getOne(id, { include: [...] })`.

## Adding filters

Filters are functions `(value) => Partial<TWhere>` keyed by name. The base class composes them with `AND` when several are supplied.

```ts
type ArticleFilters = {
    search: string;
    authorId: string;
};

@Injectable()
export class PrismaArticleRepository extends PrismaCommonRepository<
    Article,
    Record<string, never>, // no relations yet
    ArticleFilters
> {
    // ...delegate, mapBase as before...

    protected readonly filters = {
        search: (q: string) => ({
            title: { contains: q, mode: "insensitive" as const },
        }),
        authorId: (id: string) => ({ authorId: id }),
    };
}
```

Call site:

```ts
articleRepo.getPage({
    pagination: { page: 1, pageSize: 20 },
    filters: { search: "prisma", authorId: someId },
    sort: { field: "createdAt", direction: "DESC" },
});
```

Filters not provided are skipped. `filters: undefined` ⇒ no `where`.

## Adding relations

The relations registry maps a domain-side **name** to a `{ include, map, pick? }` triple:

- `include` — Prisma `include` fragment for this relation
- `map` — raw Prisma rows → domain values
- `pick` — optional accessor when the domain key differs from the Prisma field name

The TS shape of relations is declared as the second class type-parameter and drives the public `include: ["…"]` surface.

```ts
interface Article extends Entity {
    title: string;
    authorId: string;
}

interface Author {
    id: string;
    name: string;
}

interface Comment {
    id: string;
    body: string;
}

interface ArticleRelations {
    author: Author; // many-to-one
    comments: Comment[]; // one-to-many
}

@Injectable()
export class PrismaArticleRepository extends PrismaCommonRepository<
    Article,
    ArticleRelations
> {
    // ...delegate, mapBase...

    protected readonly relations = {
        author: {
            include: { author: true },
            map: (row: AuthorRow) => mapAuthor(row),
        },
        comments: {
            include: { comments: true },
            map: (rows: CommentRow[]) => rows.map(mapComment),
        },
    };
}
```

Caller picks the subset:

```ts
articleRepo.getOne(id); // Article
articleRepo.getOne(id, { include: ["author"] }); // Article & { author: Author }
articleRepo.getOne(id, { include: ["comments"] }); // Article & { comments: Comment[] }
articleRepo.getOne(id, { include: ["author", "comments"] }); // Article & { author: Author; comments: Comment[] }
```

The return type narrows automatically via `Pick<TRelations, K>` — you only see the keys you asked for. Relations you don't request issue no extra joins and run no mappers.

### When the domain key differs from the Prisma field name

If the schema field is `parentNodes` but the domain wants to call it `parents`, declare it under the domain name and use `pick` to read from the Prisma row:

```ts
parents: {
    include: { parentNodes: true },
    pick: (row: any) => row.parentNodes,
    map: (rows: ParentRow[]) => rows.map(mapParent),
},
```

## Depth-2: an optional dimension on a relation

A registry entry has **one fixed shape**. So if a relation has an optional dimension — e.g. _with_ or _without_ its own children — declare **two entries**.

Generic example: `Folder` has many `Item`s. We sometimes want each item with its tags loaded, sometimes not.

```ts
interface FolderRelations {
    items: Item[];
    itemsWithTags: Array<Item & { tags: Tag[] }>;
}

protected readonly relations = {
    items: {
        include: { items: true },
        map: (rows: ItemRow[]) => rows.map(mapItem),
    },
    itemsWithTags: {
        include: { items: { include: { tags: true } } },
        // domain key `itemsWithTags` ≠ Prisma field `items` — pick aliases the read
        pick: (row: any) => row.items,
        map: (rows: Array<ItemRow & { tags: TagRow[] }>) =>
            rows.map((r) => ({
                ...mapItem(r),
                tags: r.tags.map(mapTag),
            })),
    },
};
```

Call sites pick one **or** the other (they're mutually exclusive — both would issue duplicate joins):

```ts
folderRepo.getOne(id, { include: ["items"] }); // shallow
folderRepo.getOne(id, { include: ["itemsWithTags"] }); // hydrated
```

This generalises: any `(parent → child × optional grandchild)` combination is one registry entry per concrete shape you need. The bare entry stays cheap; the rich entry only costs the join when callers ask for it.

If you find yourself adding `xWithYAndZAndW` permutations, the registry is no longer the right tool — drop down to a custom method on the subclass.

## Depth-N: recursive trees

Prisma's `include` doesn't support unbounded recursion; the registry inherits that limit. Two practical paths:

### (a) Bounded depth via nested includes

If "deep enough" is a known number (say, 3), declare one registry entry per shape:

```ts
interface NodeRelations {
    childrenTree3: NodeWithChildren3[];
}

type NodeWithChildren3 = Node & {
    children: Array<Node & {
        children: Array<Node & {
            children: Node[];
        }>;
    }>;
};

protected readonly relations = {
    childrenTree3: {
        include: {
            children: {
                include: {
                    children: { include: { children: true } },
                },
            },
        },
        map: (rows: any[]) =>
            rows.map(function mapNode(r): NodeWithChildren3 {
                return {
                    ...mapBase(r),
                    children: (r.children ?? []).map(mapNode),
                };
            }),
    },
};
```

Predictable, type-safe, single round-trip. Becomes verbose past depth 3 — reserve for trees that genuinely have a known ceiling.

### (b) Recursive CTE (raw SQL)

For arbitrary depth in **one query**, leave the typed query builder and use a recursive CTE via `$queryRaw`. Add a custom method on the subclass — the base class is untouched.

```ts
type NodeTree = Node & { children: NodeTree[] };

@Injectable()
export class PrismaNodeRepository extends PrismaCommonRepository<
    Node,
    NodeRelations
> {
    // ...standard members...

    async getTree(rootId: string): Promise<NodeTree | null> {
        const rows = await this.prisma.$queryRaw<
            Array<{ id: string; parent_id: string | null /* ...node fields */ }>
        >`
            WITH RECURSIVE tree AS (
                SELECT n.*, NULL::uuid AS parent_id, 0 AS depth
                FROM "Node" n WHERE n.id = ${rootId}::uuid
              UNION ALL
                SELECT child.*, parent.id, tree.depth + 1
                FROM "Node" child
                JOIN "Node" parent ON child."parentId" = parent.id
                JOIN tree ON tree.id = parent.id
            )
            SELECT * FROM tree;
        `;
        return assembleTree(rows, rootId);
    }
}

// O(n) in-memory tree assembly
function assembleTree(rows: NodeRow[], rootId: string): NodeTree | null {
    const byId = new Map(
        rows.map((r) => [r.id, { ...mapNode(r), children: [] as NodeTree[] }]),
    );
    for (const r of rows) {
        if (r.parent_id) byId.get(r.parent_id)?.children.push(byId.get(r.id)!);
    }
    return byId.get(rootId) ?? null;
}
```

One round-trip regardless of depth. Cost: hand-written SQL and an explicit assembler. Reserve for hot paths where depth is unbounded and (a) is impractical.

### Picking between them

| Tree shape                      | Best fit                           |
| ------------------------------- | ---------------------------------- |
| Known shallow ceiling           | (a) Nested include in the registry |
| Variable, can be deep, hot path | (b) Recursive CTE on the subclass  |

Both options coexist with the rest of the registry: bounded variants stay in `relations`, recursive ones live as custom methods on the subclass. The base class isn't aware of either choice.

## The query shape (`Query` / `PageQuery`)

Read methods take a single `query` object, defined in [`@monsieurtis/core`](../../core/src/utils/query.ts):

```ts
interface Query<TFilter, TSort, TInclude> {
    filters?: TFilter;
    sort?: { field: TSort; direction: "ASC" | "DESC" };
    include?: TInclude[];
}

interface PageQuery<TFilter, TSort, TInclude> extends Query<...> {
    pagination: { page: number; pageSize: number };
}
```

The base class instantiates the three slots per call as:

| Slot       | Concrete type                                                                    |
| ---------- | -------------------------------------------------------------------------------- |
| `TFilter`  | `Partial<TFilters>`                                                              |
| `TSort`    | `keyof TEntity & string`                                                         |
| `TInclude` | `keyof TRelations` (one item; the array shape comes from `include?: TInclude[]`) |

Callers don't have to instantiate `Query`/`PageQuery` directly — they pass a literal `{ filters, sort, include, pagination }` and TypeScript narrows the result type from the `include` array.

## Caveats

- **`updateMany` / `deleteMany` return the input ids**, not the count of affected rows. If a passed id didn't match a real row, it's still in the returned array. Replace with a 2-step `findMany` + `updateMany|deleteMany` in subclasses where that distinction matters.
- **`createMany` uses `createManyAndReturn`** (Prisma 5+). The base class selects `{ id: true }` and returns the new ids.
- **Filters are always combined with `AND`.** For `OR` between filters, declare a single richer filter that takes a structured value and emits `{ OR: [...] }` itself.
- **`where` and `orderBy` are typed loosely (`object`)** in the default `PrismaDelegate` interface. Subclasses can tighten by passing `Prisma.<Model>WhereInput` etc. as the 4th–7th type parameters; defaults keep the surface usable without that.
- **Relations don't auto-recurse.** The map function for a relation is invoked **once per call** with the raw rows and is responsible for any nested mapping (e.g. `subSetupsWithIngredients` runs `mapItem` over each child plus `mapTag` over each child's tags).
