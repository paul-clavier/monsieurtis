# Service Architecture

This backend follows Clean Architecture / Hexagonal Architecture with strict layer separation and dependency injection via NestJS.

## Canonical Layout

```
src/
├── domain/
│   ├── injection-tokens.ts              # DI tokens: string constants for all repositories & clients
│   ├── use-cases/
│   │   ├── use-case.ts                  # UseCase<Port, Result> interface
│   │   ├── query/
│   │   │   └── fetch-{entity}.use-case.ts
│   │   └── mutate/
│   │       └── create-{entity}.use-case.ts
│   └── {entity}/
│       ├── {entity}.entity.ts           # Domain entity (pure TS interfaces, no framework imports)
│       ├── {entity}.repository.ts       # Repository interface (port)
│       ├── {entity}.filter.ts           # Query filter interface
│       ├── {entity}.error.ts            # Domain-specific error classes
│       ├── {entity}.service.ts          # Optional: caching, orchestration, lifecycle
│       ├── {entity}.service.module.ts   # NestJS module for the service (isolates its deps)
│       └── {entity}.module.ts           # NestJS domain module(s): provides use cases, imports InfraModule
├── infrastructure/
│   ├── prisma/
│   │   ├── prisma.service.ts            # Prisma client wrapper
│   │   ├── repositories.provider.ts     # Maps tokens → concrete Prisma implementations
│   │   ├── repositories.module.ts       # Central module: provides & exports all repository providers
│   │   └── repositories/
│   │       └── {entity}.repository.ts   # Concrete Prisma implementation of domain interface
│   └── {backend}/                       # Named after external dependency: redis, airtable, mqtt, …
│       ├── {backend}.client.ts          # Concrete client implementation
│       ├── {backend}.provider.ts        # Provider: token → useClass
│       └── {backend}.module.ts          # NestJS module
├── presentation/
│   ├── api/
│   │   ├── common/
│   │   │   └── {entity}/
│   │   │       ├── {entity}.dto.ts      # Request/response DTOs (class-validator, Swagger decorators)
│   │   │       └── {entity}.mapper.ts   # Domain entity → response DTO mapping functions
│   │   ├── internal/                    # API surface for mode "internal"
│   │   │   └── {entity}/
│   │   │       ├── {entity}.controller.ts
│   │   │       └── {entity}.module.ts   # Imports domain module + auth module, declares controller
│   │   └── external/                    # API surface for mode "external" (optional)
│   │       └── …
│   ├── auth/
│   │   ├── auth.guard.ts               # JWT / API key guards
│   │   └── permission.guard.ts          # RBAC @Permission() decorator + guard
│   ├── task/                            # Scheduled background jobs
│   └── presentation.module.ts           # Aggregates all API modules per mode
├── app.module.ts                        # Composition root: mode-based module loading
└── utils/
    ├── types.ts                         # BaseEntity, Mutable<T>, DeepPartial<T>, …
    └── errors.ts                        # DomainError, ObjectNotFoundError base classes
```

## Layer Rules

**Domain** (`domain/`): entities, repository interfaces, use cases, domain services. Never imports from infrastructure or presentation.

**Infrastructure** (`infrastructure/`): concrete repository/client implementations. Only imports domain interfaces and entities — never use cases.

**Presentation** (`presentation/`): controllers, DTOs, guards, mappers. Delegates all business logic to use cases. Never imports infrastructure directly — receives dependencies through domain modules.

## Import Rules

| From → To | Allowed? |
|-----------|----------|
| Domain → Infrastructure | No |
| Domain → Presentation | No |
| Infrastructure → Domain interfaces/entities | Yes |
| Presentation → Domain use cases/entities | Yes |
| Presentation → Infrastructure | No (use DI) |
| Any layer → `utils/` | Yes |

---

## Dependency Injection Patterns

### 1. Injection tokens — `domain/injection-tokens.ts`

String constants used as DI tokens. One per repository interface and per external client interface.

```typescript
// domain/injection-tokens.ts
export const ITEM_REPOSITORY = "ITEM_REPOSITORY";
export const NOTIFICATION_CLIENT = "NOTIFICATION_CLIENT";
```

### 2. Repository provider — `infrastructure/repositories/repositories.provider.ts`

Maps each token to its concrete implementation. Typed with `Provider<Interface>` for safety.

```typescript
// infrastructure/repositories/repositories.provider.ts
import { ItemRepository } from "@/domain/item/item.repository";
import { ITEM_REPOSITORY } from "@/domain/injection-tokens";
import { PrismaItemRepository } from "./repositories/item.repository";
import { Provider } from "@nestjs/common";

export const ItemRepositoryProvider: Provider<ItemRepository> = {
    provide: ITEM_REPOSITORY,
    useClass: PrismaItemRepository,
};
```

### 3. Repositories module — `infrastructure/repositories/repositories.module.ts`

Gathers all providers. Any domain module needing a repository imports this module.

```typescript
// infrastructure/repositories/repositories.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ItemRepositoryProvider } from "./repositories.provider";

const repositories = [ItemRepositoryProvider];

@Module({
    providers: [PrismaService, ...repositories],
    exports: [PrismaService, ...repositories],
})
export class RepositoriesModule {}
```

### 4. Injecting in use cases

Use cases receive interfaces via `@Inject(TOKEN)`.

```typescript
@Injectable()
export class FetchItemUseCase implements UseCase<FetchItemPort, FetchItemResult> {
    constructor(
        @Inject(ITEM_REPOSITORY)
        private readonly itemRepository: ItemRepository,
    ) {}
}
```

### 5. Injecting in controllers

Use cases are `@Injectable()` classes — NestJS resolves them directly by class (no token needed).

```typescript
@Controller("items")
export class ItemController {
    constructor(
        private readonly fetchItemsUseCase: FetchItemsUseCase,
        private readonly createItemUseCase: CreateItemUseCase,
    ) {}
}
```

---

## Example: Fetch Feature

Goal: expose a `GET /api/items` endpoint that returns a list of items matching optional filters.

### 1. Domain entity — `domain/item/item.entity.ts`

Pure TypeScript interfaces. No ORM, no framework imports. Use composition types for rich read models.

```typescript
// domain/item/item.entity.ts

export interface Item {
    id: number;
    name: string;
    ownerId: number;
    available: boolean;
}

export interface ItemInfo {
    itemId: number;
    description: string | undefined;
    category: string | undefined;
}

// Composed read model
export type ItemDetail = Omit<Item, "ownerId"> & {
    owner: Owner;
    itemInfo: ItemInfo;
};
```

### 2. Repository interface — `domain/item/item.repository.ts`

The contract the domain needs from persistence. The domain never knows about Prisma.

```typescript
// domain/item/item.repository.ts
import { Item, ItemDetail } from "./item.entity";
import { ItemFilters } from "./item.filter";
import { Mutable } from "@/utils/types";

export interface ItemRepository {
    findMany: (filters: ItemFilters) => Promise<ItemDetail[]>;
    findById: (id: number) => Promise<ItemDetail | null>;
    create: (item: Mutable<Item>) => Promise<Item>;
    update: (id: number, data: Partial<Mutable<Item>>) => Promise<Item>;
}
```

### 3. Filter interface — `domain/item/item.filter.ts`

Typed query filter object, used by both use cases and repositories.

```typescript
// domain/item/item.filter.ts
export interface ItemFilters {
    ownerId?: number;
    category?: string;
    available?: boolean;
    search?: string;
}
```

### 4. Use case — `domain/use-cases/query/fetch-items.use-case.ts`

One file per use case. The port carries the input, the return type carries the output.

```typescript
// domain/use-cases/query/fetch-items.use-case.ts
import { Inject, Injectable } from "@nestjs/common";
import { ITEM_REPOSITORY } from "@/domain/injection-tokens";
import type { ItemRepository } from "@/domain/item/item.repository";
import { ItemDetail } from "@/domain/item/item.entity";
import { ItemFilters } from "@/domain/item/item.filter";
import { UseCase } from "../use-case";

type FetchItemsPort = ItemFilters;
type FetchItemsResult = ItemDetail[];

@Injectable()
export class FetchItemsUseCase
    implements UseCase<FetchItemsPort, FetchItemsResult>
{
    constructor(
        @Inject(ITEM_REPOSITORY)
        private readonly itemRepository: ItemRepository,
    ) {}

    execute(port: FetchItemsPort): Promise<FetchItemsResult> {
        return this.itemRepository.findMany(port);
    }
}
```

### 5. UseCase interface — `domain/use-cases/use-case.ts`

```typescript
// domain/use-cases/use-case.ts
export interface UseCase<Port, Result> {
    execute(port: Port): Promise<Result>;
}
```

### 6. Domain module — `domain/item/item.module.ts`

Imports `RepositoriesModule` to satisfy injection tokens. Provides and exports use cases for the presentation layer.

```typescript
// domain/item/item.module.ts
import { RepositoriesModule } from "@/infrastructure/repositories/repositories.module";
import { Module } from "@nestjs/common";
import { FetchItemsUseCase } from "../use-cases/query/fetch-items.use-case";
import { FetchItemUseCase } from "../use-cases/query/fetch-item.use-case";

const USE_CASES = [FetchItemsUseCase, FetchItemUseCase];

@Module({
    providers: [...USE_CASES],
    imports: [RepositoriesModule],
    exports: [...USE_CASES],
})
export class ItemDomainModule {}
```

### 7. Concrete repository — `infrastructure/repositories/repositories/item.repository.ts`

Implements the domain interface. Maps Prisma models to domain entities. All ORM details stay here.

```typescript
// infrastructure/repositories/repositories/item.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ItemRepository } from "@/domain/item/item.repository";
import { Item, ItemDetail } from "@/domain/item/item.entity";
import { ItemFilters } from "@/domain/item/item.filter";
import { Mutable } from "@/utils/types";

// Prisma result → domain entity mapper
const mapToItemDetail = (row: any): ItemDetail => ({
    id: row.id,
    name: row.name,
    available: row.available,
    owner: row.owner,
    itemInfo: {
        itemId: row.itemInfo.itemId,
        description: row.itemInfo.description,
        category: row.itemInfo.category,
    },
});

@Injectable()
export class PrismaItemRepository implements ItemRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findMany(filters: ItemFilters): Promise<ItemDetail[]> {
        const rows = await this.prisma.item.findMany({
            where: {
                ...(filters.ownerId && { ownerId: filters.ownerId }),
                ...(filters.available !== undefined && { available: filters.available }),
                ...(filters.search && {
                    name: { contains: filters.search, mode: "insensitive" },
                }),
            },
            include: { owner: true, itemInfo: true },
        });
        return rows.map(mapToItemDetail);
    }

    async findById(id: number): Promise<ItemDetail | null> {
        const row = await this.prisma.item.findUnique({
            where: { id },
            include: { owner: true, itemInfo: true },
        });
        return row ? mapToItemDetail(row) : null;
    }

    async create(data: Mutable<Item>): Promise<Item> {
        return this.prisma.item.create({ data });
    }

    async update(id: number, data: Partial<Mutable<Item>>): Promise<Item> {
        return this.prisma.item.update({ where: { id }, data });
    }
}
```

### 8. DTO — `presentation/api/common/items/item.dto.ts`

Separate from domain entities. Decorated for validation (class-validator) and API docs (Swagger).

```typescript
// presentation/api/common/items/item.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class ItemFilterQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    ownerId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === "true")
    available?: boolean;
}
```

### 9. Mapper — `presentation/api/common/items/item.mapper.ts`

Pure functions. Domain entity in, response shape out.

```typescript
// presentation/api/common/items/item.mapper.ts
import { ItemDetail } from "@/domain/item/item.entity";

export interface ItemResponse {
    id: number;
    name: string;
    available: boolean;
    ownerName: string;
    category: string | undefined;
}

export const mapItemToResponse = (item: ItemDetail): ItemResponse => ({
    id: item.id,
    name: item.name,
    available: item.available,
    ownerName: item.owner.name,
    category: item.itemInfo.category,
});
```

### 10. Controller — `presentation/api/internal/items/item.controller.ts`

Routes to use cases. Never instantiates anything. Maps responses via mappers.

```typescript
// presentation/api/internal/items/item.controller.ts
import { Controller, Get, HttpStatus, Param, Query, UseGuards } from "@nestjs/common";
import { FetchItemsUseCase } from "@/domain/use-cases/query/fetch-items.use-case";
import { FetchItemUseCase } from "@/domain/use-cases/query/fetch-item.use-case";
import { AccessTokenGuard } from "@/presentation/auth/auth.guard";
import { Permission } from "@/presentation/auth/permission.guard";
import { ItemFilterQueryDto } from "../../common/items/item.dto";
import { mapItemToResponse } from "../../common/items/item.mapper";
import { throwHttpException } from "../../errors";

@Controller("items")
@UseGuards(AccessTokenGuard)
export class ItemController {
    constructor(
        private readonly fetchItemsUseCase: FetchItemsUseCase,
        private readonly fetchItemUseCase: FetchItemUseCase,
    ) {}

    @Get("/")
    @Permission("ITEMS", ["read"])
    async fetchAll(@Query() filters: ItemFilterQueryDto) {
        const items = await this.fetchItemsUseCase.execute(filters);
        return items.map(mapItemToResponse);
    }

    @Get("/:id")
    @Permission("ITEMS", ["read"])
    async fetchOne(@Param("id") id: number) {
        const item = await this.fetchItemUseCase.execute({ id });
        if (!item) {
            throw throwHttpException(HttpStatus.NOT_FOUND, {
                code: "ItemNotFound",
                message: `Item with id ${id} not found`,
            });
        }
        return mapItemToResponse(item);
    }
}
```

### 11. Presentation module — `presentation/api/internal/items/item.module.ts`

Imports the domain module (which brings use cases) and auth. Declares the controller.

```typescript
// presentation/api/internal/items/item.module.ts
import { ItemDomainModule } from "@/domain/item/item.module";
import { PermissionDomainModule } from "@/domain/auth/permission/permission.module";
import { Module } from "@nestjs/common";
import { ItemController } from "./item.controller";

@Module({
    imports: [ItemDomainModule, PermissionDomainModule],
    controllers: [ItemController],
})
export class ItemInternalModule {}
```

---

## Example: Mutate Feature

Goal: expose a `POST /api/items` endpoint that creates a new item.

The structure mirrors the fetch example. Only what differs is shown.

### Use case — `domain/use-cases/mutate/create-item.use-case.ts`

Mutating use cases follow the same `UseCase<Port, Result>` contract. The port carries all input. Multiple repositories can be injected.

```typescript
// domain/use-cases/mutate/create-item.use-case.ts
import { Inject, Injectable } from "@nestjs/common";
import { ITEM_REPOSITORY, OWNER_REPOSITORY } from "@/domain/injection-tokens";
import type { ItemRepository } from "@/domain/item/item.repository";
import type { OwnerRepository } from "@/domain/owner/owner.repository";
import { Item } from "@/domain/item/item.entity";
import { OwnerNotFoundError } from "@/domain/owner/owner.error";
import { UseCase } from "../use-case";

export interface CreateItemPort {
    name: string;
    ownerId: number;
    available?: boolean;
}

export type CreateItemResult = Item;

@Injectable()
export class CreateItemUseCase
    implements UseCase<CreateItemPort, CreateItemResult>
{
    constructor(
        @Inject(ITEM_REPOSITORY)
        private readonly itemRepository: ItemRepository,
        @Inject(OWNER_REPOSITORY)
        private readonly ownerRepository: OwnerRepository,
    ) {}

    async execute(port: CreateItemPort): Promise<CreateItemResult> {
        const owner = await this.ownerRepository.findById(port.ownerId);
        if (!owner) {
            throw new OwnerNotFoundError({ id: port.ownerId });
        }

        return this.itemRepository.create({
            name: port.name,
            ownerId: port.ownerId,
            available: port.available ?? true,
        });
    }
}
```

### Domain module — add `CreateItemUseCase`

```typescript
const USE_CASES = [FetchItemsUseCase, FetchItemUseCase, CreateItemUseCase];
```

### Controller — `POST /items`

```typescript
@Post("/")
@Permission("ITEMS", ["write"])
async create(@Body() body: CreateItemDto) {
    const item = await this.createItemUseCase.execute({
        name: body.name,
        ownerId: body.ownerId,
        available: body.available,
    });
    return mapItemToResponse(item);
}
```

---

## Error Handling Pattern

### Domain errors — `domain/{entity}/{entity}.error.ts`

Custom error classes per entity. Extend `DomainError` or `ObjectNotFoundError` base classes.

```typescript
// domain/item/item.error.ts
import { DomainError, ObjectNotFoundError } from "@/utils/errors";
import { Item } from "./item.entity";

export class ItemNotFoundError extends ObjectNotFoundError<Pick<Item, "id" | "name">> {
    constructor(identifiers: Partial<Pick<Item, "id" | "name">>) {
        super("Item", identifiers);
    }
}

export class ItemAlreadyExistsError extends DomainError {
    constructor(name: string) {
        super("ItemAlreadyExistsError", `Item "${name}" already exists`);
    }
}
```

### Controller error mapping

Controllers catch domain errors and map them to HTTP status codes.

```typescript
// In the controller
const item = await this.fetchItemUseCase.execute({ id });
if (!item) {
    throw throwHttpException(HttpStatus.NOT_FOUND, {
        code: "ItemNotFound",
        message: `Item with id ${id} not found`,
    });
}
```

---

## External Client Pattern

For services calling external systems (APIs, message brokers, etc.), the pattern mirrors repositories.

### 1. Client interface in domain

```typescript
// domain/item/notification.client.ts
export interface NotificationClient {
    notifyCreated: (itemId: number) => Promise<void>;
}
```

### 2. Injection token

```typescript
// domain/injection-tokens.ts
export const NOTIFICATION_CLIENT = "NOTIFICATION_CLIENT";
```

### 3. Concrete implementation in infrastructure

```typescript
// infrastructure/notification/notification.client.ts
import { Injectable } from "@nestjs/common";
import { NotificationClient } from "@/domain/item/notification.client";

@Injectable()
export class HttpNotificationClient implements NotificationClient {
    async notifyCreated(itemId: number): Promise<void> {
        // HTTP call to external notification service
    }
}
```

### 4. Provider + Module

```typescript
// infrastructure/notification/notification.provider.ts
export const NotificationClientProvider: Provider<NotificationClient> = {
    provide: NOTIFICATION_CLIENT,
    useClass: HttpNotificationClient,
};

// infrastructure/notification/notification.module.ts
@Module({
    providers: [NotificationClientProvider],
    exports: [NotificationClientProvider],
})
export class NotificationModule {}
```

---

## Domain Service Pattern

For cross-cutting concerns like caching or complex orchestration that don't fit a single use case.

```typescript
// domain/item/item.service.ts
@Injectable()
export class ItemService implements OnModuleInit, OnModuleDestroy {
    private cachedItems: ItemDetail[] = [];
    private refreshInterval: NodeJS.Timeout | null = null;

    constructor(
        @Inject(ITEM_REPOSITORY)
        private readonly itemRepository: ItemRepository,
    ) {}

    onModuleInit() {
        this.refresh();
        this.refreshInterval = setInterval(() => this.refresh(), 60_000);
    }

    onModuleDestroy() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    private async refresh() {
        this.cachedItems = await this.itemRepository.findMany({});
    }

    getCachedItems(): ItemDetail[] {
        return this.cachedItems;
    }
}
```

Wrap in a dedicated module to isolate dependencies:

```typescript
// domain/item/item.service.module.ts
@Module({
    providers: [ItemService],
    imports: [RepositoriesModule],
    exports: [ItemService],
})
export class ItemServiceModule {}
```

---

## Multi-Mode Deployment

The same codebase can serve different API surfaces by deployment mode. Each mode selectively imports feature modules.

```typescript
// domain/item/item.module.ts
const USE_CASES_INTERNAL = [FetchItemsUseCase, FetchItemUseCase];
const USE_CASES_EXTERNAL = [FetchItemUseCase, CreateItemUseCase, UpdateItemUseCase];

@Module({
    providers: [...USE_CASES_INTERNAL],
    imports: [RepositoriesModule],
    exports: [...USE_CASES_INTERNAL],
})
export class ItemInternalDomainModule {}

@Module({
    providers: [...USE_CASES_EXTERNAL],
    imports: [RepositoriesModule],
    exports: [...USE_CASES_EXTERNAL],
})
export class ItemExternalDomainModule {}
```

```typescript
// app.module.ts
const getAppModule = (mode: string) => {
    switch (mode) {
        case "internal":
            return [PresentationInternalModule];
        case "external":
            return [PresentationExternalModule];
        case "task":
            return [TaskModule];
        default:
            throw new Error(`Unknown mode: ${mode}`);
    }
};

@Module({
    imports: [
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        ConfigModule.forRoot({ isGlobal: true }),
        ...getAppModule(BACKEND_MODE),
    ],
})
export class AppModule {}
```

---

## Utility Types — `utils/types.ts`

```typescript
export interface BaseEntity {
    id: number;
    createdAt: Date;
    updatedAt: Date;
}

// Strip readonly & BaseEntity fields for creation payloads
export type Mutable<T> = Omit<T, keyof BaseEntity>;

// Recursive partial
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

---

## Conventions Summary

| Concern | Convention |
|---------|-----------|
| **File naming** | `kebab-case`: `item.entity.ts`, `fetch-items.use-case.ts`, `item.repository.ts` |
| **Class naming** | `PascalCase`: `FetchItemsUseCase`, `PrismaItemRepository`, `ItemController` |
| **Token naming** | `UPPER_SNAKE_CASE`: `ITEM_REPOSITORY`, `NOTIFICATION_CLIENT` |
| **Injection** | Repositories/clients via `@Inject(TOKEN)`. Use cases via direct class injection. |
| **Use case I/O** | Port (input interface) + Result (output type alias), both co-located in the use case file |
| **Use case organization** | `query/` for reads, `mutate/` for writes |
| **Entity immutability** | Domain entities are readonly interfaces. `Mutable<T>` strips `BaseEntity` fields for writes. |
| **Mapping** | Prisma → domain in repository. Domain → response DTO in presentation mapper. |
| **DTOs** | Live in `presentation/api/common/{entity}/`. Decorated with class-validator + Swagger. |
| **Errors** | Domain errors in `domain/{entity}/`. Mapped to HTTP status in controllers. |
| **Modules** | Domain modules provide use cases. Presentation modules declare controllers. Infrastructure modules provide concrete implementations. |
