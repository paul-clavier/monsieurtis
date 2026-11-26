import { slugify } from "@/utils/format";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Setup } from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import type {
    SetupCreateDTO,
    SetupCreateInput,
} from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { SetupCreate } from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { Button } from "@monsieurtis/ui/components/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@monsieurtis/ui/components/form";
import { Input } from "@monsieurtis/ui/components/input";
import { Textarea } from "@monsieurtis/ui/components/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PhotoPicker } from "./components/photo-picker";
import { SubSetupPicker } from "./components/sub-setup-picker";
import { TagInput } from "./components/tag-input";

export interface SetupFormSubmit {
    setup: SetupCreateDTO;
    photos: File[];
}

interface SetupFormProps {
    setups: Setup[];
    tags: Tag[];
    submitting: boolean;
    onSubmit: (values: SetupFormSubmit) => void;
    onCancel: () => void;
}

const DEFAULT_VALUES: SetupCreateInput = {
    name: "",
    label: "",
    description: "",
    time: 30,
    capacity: null,
    dressing: null,
    tagNames: [],
    subSetupIds: [],
};

const toNullableNumber = (value: string) =>
    value === "" ? null : Number(value);
const toNullableText = (value: string) => (value.trim() === "" ? null : value);

export const SetupForm = ({
    setups,
    tags,
    submitting,
    onSubmit,
    onCancel,
}: SetupFormProps) => {
    const [photos, setPhotos] = useState<File[]>([]);
    const [slugTouched, setSlugTouched] = useState(false);
    const form = useForm<SetupCreateInput, unknown, SetupCreateDTO>({
        resolver: zodResolver(SetupCreate),
        defaultValues: DEFAULT_VALUES,
    });

    return (
        <Form {...form}>
            <form
                className="setup-form"
                onSubmit={form.handleSubmit((setup) =>
                    onSubmit({ setup, photos }),
                )}
                noValidate
            >
                <section className="form-section">
                    <h2 className="form-section-title">The basics</h2>
                    <FormField
                        control={form.control}
                        name="label"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        className="title-input"
                                        placeholder="Grandma's tomato sauce"
                                        autoFocus
                                        onChange={(event) => {
                                            field.onChange(event);
                                            if (!slugTouched) {
                                                form.setValue(
                                                    "name",
                                                    slugify(event.target.value),
                                                    {
                                                        shouldValidate:
                                                            form.formState
                                                                .isSubmitted,
                                                    },
                                                );
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Slug</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        className="font-mono"
                                        placeholder="grandmas-tomato-sauce"
                                        onChange={(event) => {
                                            setSlugTouched(true);
                                            field.onChange(event);
                                        }}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Unique name in the book, filled from the
                                    title.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Method</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        rows={6}
                                        placeholder="Sweat the onions, add the tomatoes, let it bubble gently…"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid gap-6 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Time (minutes)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={5}
                                            name={field.name}
                                            ref={field.ref}
                                            onBlur={field.onBlur}
                                            value={
                                                Number.isNaN(field.value)
                                                    ? ""
                                                    : field.value
                                            }
                                            onChange={(event) =>
                                                field.onChange(
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
                            name="capacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Serves</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="—"
                                            name={field.name}
                                            ref={field.ref}
                                            onBlur={field.onBlur}
                                            value={field.value ?? ""}
                                            onChange={(event) =>
                                                field.onChange(
                                                    toNullableNumber(
                                                        event.target.value,
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
                        name="dressing"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dressing</FormLabel>
                                <FormControl>
                                    <Textarea
                                        name={field.name}
                                        ref={field.ref}
                                        onBlur={field.onBlur}
                                        rows={2}
                                        placeholder="A few basil leaves, a thread of olive oil…"
                                        value={field.value ?? ""}
                                        onChange={(event) =>
                                            field.onChange(
                                                toNullableText(
                                                    event.target.value,
                                                ),
                                            )
                                        }
                                    />
                                </FormControl>
                                <FormDescription>
                                    How it is plated and finished.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </section>

                <section className="form-section">
                    <h2 className="form-section-title">In the index</h2>
                    <FormField
                        control={form.control}
                        name="tagNames"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tags</FormLabel>
                                <FormControl>
                                    <TagInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        suggestions={tags}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subSetupIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Made with</FormLabel>
                                <FormControl>
                                    <SubSetupPicker
                                        setups={setups}
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Child setups this one is built from.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </section>

                <section className="form-section">
                    <h2 className="form-section-title">Photos</h2>
                    <PhotoPicker value={photos} onChange={setPhotos} />
                </section>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" size="lg" disabled={submitting}>
                        {submitting && <Loader2Icon className="animate-spin" />}
                        Write it in the book
                    </Button>
                </div>
            </form>
        </Form>
    );
};
