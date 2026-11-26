import { cn } from "@monsieurtis/ui/lib/utils";
import { UtensilsCrossedIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PhotoFrameProps {
    src?: string;
    alt: string;
    caption?: ReactNode;
    className?: string;
    children?: ReactNode;
}

export const PhotoFrame = ({
    src,
    alt,
    caption,
    className,
    children,
}: PhotoFrameProps) => (
    <figure className={cn("photo", className)}>
        <div className="photo-frame">
            {src ? (
                <img src={src} alt={alt} loading="lazy" />
            ) : (
                <div className="photo-empty">
                    <UtensilsCrossedIcon className="size-8" />
                </div>
            )}
            {children}
        </div>
        {caption && <figcaption>{caption}</figcaption>}
    </figure>
);
