import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@monsieurtis/ui/components/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@monsieurtis/ui/components/popover";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

interface CategoryChipProps {
    category: string;
    tags: Tag[];
    selected: string[];
    onToggle: (name: string) => void;
}

export const CategoryChip = ({
    category,
    tags,
    selected,
    onToggle,
}: CategoryChipProps) => {
    const active = tags.filter((tag) => selected.includes(tag.name));
    const summary =
        active.length === 0
            ? null
            : active.length === 1
              ? active[0]?.name
              : `${active.length} selected`;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="category-chip"
                    data-active={active.length > 0 || undefined}
                >
                    <span className="category-chip-label">{category}</span>
                    {summary && (
                        <span className="category-chip-value">{summary}</span>
                    )}
                    <ChevronDownIcon />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="category-menu">
                <Command shouldFilter={false} className="bg-transparent">
                    <CommandList>
                        <CommandGroup>
                            {tags.map((tag) => (
                                <CommandItem
                                    key={tag.name}
                                    value={tag.name}
                                    onSelect={() => onToggle(tag.name)}
                                >
                                    <span className="category-check">
                                        {selected.includes(tag.name) && (
                                            <CheckIcon />
                                        )}
                                    </span>
                                    {tag.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
