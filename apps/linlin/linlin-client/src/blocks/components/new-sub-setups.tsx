import { slugify } from "@/utils/format";
import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import type { SetupCreateInput } from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { Button } from "@monsieurtis/ui/components/button";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@monsieurtis/ui/components/form";
import { Input } from "@monsieurtis/ui/components/input";
import { Textarea } from "@monsieurtis/ui/components/textarea";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { Path } from "react-hook-form";
import { useFieldArray, useFormContext } from "react-hook-form";
import { TagInput } from "./tag-input";

type FormPath = Path<SetupCreateInput>;

const EMPTY_SUB_SETUP: SetupCreateInput = {
    name: "",
    label: "",
    description: "",
    time: 15,
    capacity: null,
    dressing: null,
    tagNames: [],
    subSetupIds: [],
    newSubSetups: [],
};

interface NewSubSetupsProps {
    path?: string;
    tags: Tag[];
    depth?: number;
}

const MAX_DEPTH = 3;

export const NewSubSetups = ({ path, tags, depth = 0 }: NewSubSetupsProps) => {
    const form = useFormContext<SetupCreateInput>();
    const name = (path ? `${path}.newSubSetups` : "newSubSetups") as never;
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name,
    });
    const at = (index: number, key: string) =>
        `${name}.${index}.${key}` as FormPath;

    return (
        <div className="new-sub-setups" data-depth={depth}>
            {fields.map((field, index) => (
                <fieldset key={field.id} className="new-sub-setup">
                    <div className="new-sub-setup-head">
                        <span className="eyebrow">New sub-setup</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Remove sub-setup"
                            onClick={() => remove(index)}
                        >
                            <Trash2Icon />
                        </Button>
                    </div>
                    <FormField
                        control={form.control}
                        name={at(index, "label")}
                        render={({ field: input }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input
                                        name={input.name}
                                        ref={input.ref}
                                        onBlur={input.onBlur}
                                        value={String(input.value ?? "")}
                                        placeholder="Pizza dough"
                                        onChange={(event) => {
                                            input.onChange(event.target.value);
                                            form.setValue(
                                                at(index, "name"),
                                                slugify(event.target.value),
                                                {
                                                    shouldValidate:
                                                        form.formState
                                                            .isSubmitted,
                                                },
                                            );
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={at(index, "name")}
                        render={() => (
                            <FormItem>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name={at(index, "time")}
                            render={({ field: input }) => (
                                <FormItem>
                                    <FormLabel>Time (minutes)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={5}
                                            name={input.name}
                                            ref={input.ref}
                                            onBlur={input.onBlur}
                                            value={
                                                Number.isNaN(input.value)
                                                    ? ""
                                                    : Number(input.value)
                                            }
                                            onChange={(event) =>
                                                input.onChange(
                                                    event.target.valueAsNumber,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={at(index, "capacity")}
                            render={({ field: input }) => (
                                <FormItem>
                                    <FormLabel>Serves</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="—"
                                            name={input.name}
                                            ref={input.ref}
                                            onBlur={input.onBlur}
                                            value={Number(input.value) || ""}
                                            onChange={(event) =>
                                                input.onChange(
                                                    event.target.value === ""
                                                        ? null
                                                        : Number(
                                                              event.target
                                                                  .value,
                                                          ),
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name={at(index, "description")}
                        render={({ field: input }) => (
                            <FormItem>
                                <FormLabel>Method</FormLabel>
                                <FormControl>
                                    <Textarea
                                        name={input.name}
                                        ref={input.ref}
                                        onBlur={input.onBlur}
                                        rows={3}
                                        value={String(input.value ?? "")}
                                        onChange={(event) =>
                                            input.onChange(event.target.value)
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={at(index, "tagNames")}
                        render={({ field: input }) => (
                            <FormItem>
                                <FormLabel>Tags</FormLabel>
                                <FormControl>
                                    <TagInput
                                        value={
                                            Array.isArray(input.value)
                                                ? input.value.map(String)
                                                : []
                                        }
                                        onChange={input.onChange}
                                        suggestions={tags}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {depth < MAX_DEPTH && (
                        <NewSubSetups
                            path={`${name}.${index}`}
                            tags={tags}
                            depth={depth + 1}
                        />
                    )}
                </fieldset>
            ))}
            {depth < MAX_DEPTH + 1 && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="new-sub-setup-add"
                    onClick={() => append({ ...EMPTY_SUB_SETUP } as never)}
                >
                    <PlusIcon />
                    {depth === 0 ? "Create a sub-setup" : "Add a nested one"}
                </Button>
            )}
        </div>
    );
};
