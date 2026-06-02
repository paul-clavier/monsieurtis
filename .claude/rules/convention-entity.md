# Convention entity

This page details how Entities in Monsieur Tis are named, built, mapped, linked together.

# Naming

Entities follow a **canonical row + compositional intersections** model.

The base type `Foo` is the canonical row: scalar fields and foreign keys, with no relations populated. All other shapes are built by intersecting `Foo` with the relations that are loaded, named with a `With{Relation}[And{Relation}…]` suffix.

## Rules

1. The base `Foo` always contains scalars and foreign keys (`barId`, never `bar`). The absence of relations IS the absence.
2. A loaded relation is named `With{Relation}`. Multiple loaded relations are joined with `And`: `FooWithBarAndBazs`.
3. When children are loaded as IDs only (not as full entities), use the `Ids` suffix on the relation: `FooWithBazIds`.
4. **Only mint a named type when the same combination is used in 2+ places.** For one-off usage, compose inline: `Foo & { bar: Bar }`.
5. Pluralization follows the relation cardinality: `WithBar` (one), `WithBazs` (many).

## Standalone entity

For an entity with no relations, `Foo` is the only shape needed.

```ts
interface Foo {
    id: string;
    foo: string;
}
```

## Parent

`Foo` belongs to a parent `Bar` (`Bar` has many `Foos`, `Foo` has `barId`).

```ts
interface Foo {
    id: string;
    foo: string;
    barId: string;
}

type FooWithBar = Foo & { bar: Bar };
```

## Children

`Foo` has many children `Baz` (`Baz` has `fooId`).

```ts
interface Foo {
    id: string;
    foo: string;
    barId: string;
}

type FooWithBar = Foo & { bar: Bar };
type FooWithBazs = Foo & { bazs: Baz[] };
type FooWithBazIds = Foo & { bazIds: string[] };
type FooWithBarAndBazs = FooWithBar & { bazs: Baz[] };
```

Define only the combinations actually consumed. If a query loads `bar` and `bazIds` together exactly once, write `Foo & { bar: Bar; bazIds: string[] }` inline at the call site rather than introducing `FooWithBarAndBazIds`.

# Mutation Operations

## Create

When creating a `Foo` entity, at least a `Mutable<Foo>` should be provided.

## Update

- An `undefined` field means the field is not updated
- A `null` field means the field is set to `None`
- `FooUpdate` does not include the `id`.
