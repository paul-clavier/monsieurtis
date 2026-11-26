import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { TagName } from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { Badge } from "@monsieurtis/ui/components/badge";
import { Button } from "@monsieurtis/ui/components/button";
import { Input } from "@monsieurtis/ui/components/input";
import { PlusIcon, XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";

interface TagInputProps {
    id?: string;
    value: string[];
    onChange: (value: string[]) => void;
    suggestions: Tag[];
}

export const TagInput = ({
    id,
    value,
    onChange,
    suggestions,
}: TagInputProps) => {
    const [draft, setDraft] = useState("");

    const add = (raw: string) => {
        const parsed = TagName.safeParse(raw.toLowerCase());
        if (parsed.success && !value.includes(parsed.data)) {
            onChange([...value, parsed.data]);
        }
        setDraft("");
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add(draft);
        } else if (
            event.key === "Backspace" &&
            draft === "" &&
            value.length > 0
        ) {
            onChange(value.slice(0, -1));
        }
    };

    const unused = suggestions.filter((tag) => !value.includes(tag.name));

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
                {value.map((name) => (
                    <Badge
                        key={name}
                        variant="secondary"
                        className="gap-1 pr-1"
                    >
                        {name}
                        <button
                            type="button"
                            className="rounded-full opacity-60 hover:opacity-100"
                            onClick={() =>
                                onChange(value.filter((tag) => tag !== name))
                            }
                            aria-label={`Remove ${name}`}
                        >
                            <XIcon />
                        </button>
                    </Badge>
                ))}
                <Input
                    id={id}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={() => draft && add(draft)}
                    placeholder={
                        value.length ? "another tag…" : "italian, sauce, vegan…"
                    }
                    className="w-48 flex-1"
                />
            </div>
            {unused.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="cookbook-hand text-lg text-muted-foreground">
                        from the index:
                    </span>
                    {unused.map((tag) => (
                        <Button
                            key={tag.name}
                            type="button"
                            size="xs"
                            variant="ghost"
                            className="tag-suggestion"
                            onClick={() => add(tag.name)}
                        >
                            <PlusIcon />
                            {tag.name}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};
