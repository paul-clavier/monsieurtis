import { formatDuration } from "@/utils/format";
import type { Setup } from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from "@monsieurtis/ui/components/combobox";

interface SubSetupPickerProps {
    id?: string;
    setups: Setup[];
    value: string[];
    onChange: (value: string[]) => void;
}

export const SubSetupPicker = ({
    id,
    setups,
    value,
    onChange,
}: SubSetupPickerProps) => {
    const anchor = useComboboxAnchor();
    const selected = setups.filter((setup) => value.includes(setup.id));

    return (
        <Combobox
            multiple
            items={setups}
            value={selected}
            onValueChange={(next: Setup[]) =>
                onChange(next.map((setup) => setup.id))
            }
            itemToStringLabel={(setup: Setup) => setup.label}
            isItemEqualToValue={(a: Setup, b: Setup) => a.id === b.id}
        >
            <ComboboxChips ref={anchor}>
                <ComboboxValue>
                    {(values: Setup[]) =>
                        values.map((setup) => (
                            <ComboboxChip key={setup.id}>
                                {setup.label}
                            </ComboboxChip>
                        ))
                    }
                </ComboboxValue>
                <ComboboxChipsInput
                    id={id}
                    placeholder={
                        selected.length ? "" : "Pick sauces, doughs, garnishes…"
                    }
                />
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No setup with that name.</ComboboxEmpty>
                <ComboboxList>
                    {(setup: Setup) => (
                        <ComboboxItem key={setup.id} value={setup}>
                            <span className="flex-1">{setup.label}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatDuration(setup.time)}
                            </span>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
};
