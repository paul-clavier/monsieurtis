import { cn } from "@monsieurtis/ui/lib/utils";
import { UtensilsCrossedIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PolaroidProps {
    src?: string;
    alt: string;
    caption?: ReactNode;
    tilt?: "left" | "right" | "none";
    className?: string;
    children?: ReactNode;
}

export const Polaroid = ({
    src,
    alt,
    caption,
    tilt = "left",
    className,
    children,
}: PolaroidProps) => (
    <figure className={cn("polaroid", className)} data-tilt={tilt}>
        <div className="polaroid-frame">
            {src ? (
                <img src={src} alt={alt} loading="lazy" />
            ) : (
                <div className="polaroid-empty">
                    <UtensilsCrossedIcon className="size-10" />
                </div>
            )}
            {children}
        </div>
        {caption && (
            <figcaption className="cookbook-hand">{caption}</figcaption>
        )}
    </figure>
);
