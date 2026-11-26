import { formatDuration, plural } from "@/utils/format";
import type { Setup } from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import { cn } from "@monsieurtis/ui/lib/utils";
import { ClockIcon, LayersIcon, UsersIcon } from "lucide-react";

interface SetupMetaProps {
    setup: Pick<Setup, "time" | "capacity">;
    componentCount?: number;
    className?: string;
}

export const SetupMeta = ({
    setup,
    componentCount,
    className,
}: SetupMetaProps) => (
    <dl className={cn("setup-meta", className)}>
        <div>
            <dt className="sr-only">Time</dt>
            <dd>
                <ClockIcon />
                {formatDuration(setup.time)}
            </dd>
        </div>
        {setup.capacity !== null && (
            <div>
                <dt className="sr-only">Serves</dt>
                <dd>
                    <UsersIcon />
                    serves {setup.capacity}
                </dd>
            </div>
        )}
        {componentCount !== undefined && componentCount > 0 && (
            <div>
                <dt className="sr-only">Components</dt>
                <dd>
                    <LayersIcon />
                    {plural(componentCount, "component")}
                </dd>
            </div>
        )}
    </dl>
);
