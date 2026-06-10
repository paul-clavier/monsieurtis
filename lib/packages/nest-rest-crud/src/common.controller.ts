import { CommonUseCases, Entity } from "@monsieurtis/core";
import {
    Body,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { z } from "zod";
import { makeListQuerySchema } from "./common.schemas";
import type { ListQueryInput } from "./query.parser";
import {
    isPageRequest,
    parseInclude,
    toPageQuery,
    toQuery,
} from "./query.parser";

export interface CommonControllerOptions<
    E extends Entity,
    R extends object,
    CreateSchema extends z.ZodObject<z.ZodRawShape>,
    UpdateSchema extends z.ZodObject<z.ZodRawShape>,
    FiltersSchema extends z.ZodTypeAny,
> {
    /** Schema validating the body of `POST /` and the items of `POST /bulk`. */
    create: CreateSchema;
    /** Schema validating the body of `PATCH /:id`. Defaults to `create.partial()`. */
    update?: UpdateSchema;
    /** Schema validating each filter object in `?filters=...` for `GET /`. */
    filters?: FiltersSchema;
    /**
     * Names of relations the repository can load. The factory uses these to
     * filter out unknown values in `?include=`.
     */
    relationKeys?: ReadonlyArray<keyof R & string>;
    /**
     * Names of fields callers may sort on. The factory drops `?sort=` if the
     * field is not in this allow-list. Omit to allow any field.
     */
    sortFields?: ReadonlyArray<keyof E & string>;
}

/**
 * Returns an abstract controller class wired with the 9 standard CRUD routes.
 *
 *   GET    /            list (paged or unpaged)
 *   GET    /:id         single (with optional ?include=)
 *   POST   /            create
 *   POST   /bulk        createMany
 *   PATCH  /:id         update
 *   PATCH  /            updateMany ({ ids, data })
 *   DELETE /:id         delete
 *   DELETE /            deleteMany ({ ids })
 *
 * Subclasses must declare `useCases` (DI'd CommonUseCases) and add a
 * `@Controller("path")` decorator. Apply guards / `@Permission(...)` on the
 * subclass — either at class level (applies to all routes) or by
 * re-declaring a single route. Method overrides shadow the inherited one.
 */
export const CommonControllerMixin = <
    E extends Entity,
    R extends object,
    CreateSchema extends z.ZodObject<z.ZodRawShape>,
    FiltersSchema extends z.ZodTypeAny,
    UpdateSchema extends z.ZodObject<z.ZodRawShape> =
        z.ZodObject<z.ZodRawShape>,
>(
    opts: CommonControllerOptions<
        E,
        R,
        CreateSchema,
        UpdateSchema,
        FiltersSchema
    >,
) => {
    const updateSchema =
        opts.update ?? (opts.create.partial() as unknown as UpdateSchema);

    const listSchema = makeListQuerySchema(opts.filters);
    const createPipe = new ZodValidationPipe(opts.create);
    const updatePipe = new ZodValidationPipe(updateSchema);
    const createManyPipe = new ZodValidationPipe(z.array(opts.create));
    const updateManyPipe = new ZodValidationPipe(
        z.object({ ids: z.array(z.string()), data: updateSchema }),
    );
    const deleteManyPipe = new ZodValidationPipe(
        z.object({ ids: z.array(z.string()) }),
    );
    const listPipe = new ZodValidationPipe(listSchema);

    type CreateInput = z.infer<CreateSchema>;
    type UpdateInput = z.infer<UpdateSchema>;
    type FilterInput = FiltersSchema extends z.ZodTypeAny
        ? z.infer<FiltersSchema>
        : never;

    abstract class BaseController {
        abstract readonly useCases: CommonUseCases<
            E,
            R,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            any,
            CreateInput,
            UpdateInput
        >;

        @Get("/")
        async list(@Query(listPipe) q: ListQueryInput<FilterInput>) {
            if (isPageRequest(q)) {
                return this.useCases.getPage(
                    toPageQuery<E, Partial<R>, keyof R & string>(
                        q as typeof q & ListQueryInput<Partial<R>>,
                        opts.relationKeys,
                        opts.sortFields,
                    ),
                );
            }
            return this.useCases.getAll(
                toQuery<E, Partial<R>, keyof R & string>(
                    q as ListQueryInput<Partial<R>>,
                    opts.relationKeys,
                    opts.sortFields,
                ),
            );
        }

        @Get("/:id")
        async getOne(
            @Param("id") id: string,
            @Query("include") include?: string,
        ) {
            const include_ = parseInclude<keyof R & string>(
                include,
                opts.relationKeys,
            );
            const entity = await this.useCases.getOne(id, {
                include: include_,
            });
            if (!entity) {
                throw new NotFoundException(`Not found: ${id}`);
            }
            return entity;
        }

        @Post("/")
        async create(@Body(createPipe) body: CreateInput) {
            const id = await this.useCases.create(body);
            return { id };
        }

        @Post("/bulk")
        async createMany(@Body(createManyPipe) body: CreateInput[]) {
            const ids = await this.useCases.createMany(body);
            return { ids };
        }

        @Patch("/:id")
        async update(
            @Param("id") id: string,
            @Body(updatePipe) body: UpdateInput,
        ) {
            const updatedId = await this.useCases.update(id, body);
            return { id: updatedId };
        }

        @Patch("/")
        async updateMany(
            @Body(updateManyPipe)
            body: {
                ids: string[];
                data: UpdateInput;
            },
        ) {
            const ids = await this.useCases.updateMany(body.ids, body.data);
            return { ids };
        }

        @Delete("/:id")
        async delete(@Param("id") id: string) {
            const deletedId = await this.useCases.delete(id);
            return { id: deletedId };
        }

        @Delete("/")
        async deleteMany(@Body(deleteManyPipe) body: { ids: string[] }) {
            const ids = await this.useCases.deleteMany(body.ids);
            return { ids };
        }
    }

    return BaseController;
};
