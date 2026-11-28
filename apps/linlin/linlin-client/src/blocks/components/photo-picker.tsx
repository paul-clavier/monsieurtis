import { Button } from "@monsieurtis/ui/components/button";
import { ImagePlusIcon, XIcon } from "lucide-react";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoFrame } from "./photo-frame";

export const ACCEPTED_PHOTOS =
    "image/jpeg,image/png,image/webp,image/gif,image/avif";

const onlyImages = (files: FileList | null) =>
    Array.from(files ?? []).filter((file) =>
        ACCEPTED_PHOTOS.includes(file.type),
    );

interface PhotoPickerProps {
    value: File[];
    onChange: (files: File[]) => void;
}

export const PhotoPicker = ({ value, onChange }: PhotoPickerProps) => {
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const previews = useMemo(
        () => value.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [value],
    );

    useEffect(
        () => () =>
            previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
        [previews],
    );

    const onDrop = (event: DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setDragging(false);
        onChange([...value, ...onlyImages(event.dataTransfer.files)]);
    };

    return (
        <div className="flex flex-col gap-4">
            <button
                type="button"
                className="photo-drop"
                data-dragging={dragging || undefined}
                onClick={() => input.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                <ImagePlusIcon className="size-7" />
                <span className="eyebrow">
                    Drop photos here, or click to pick some
                </span>
                <span className="text-xs text-muted-foreground">
                    JPEG, PNG, WebP, GIF or AVIF · up to 10 MB each
                </span>
            </button>
            <input
                ref={input}
                type="file"
                accept={ACCEPTED_PHOTOS}
                multiple
                hidden
                onChange={(event) => {
                    onChange([...value, ...onlyImages(event.target.files)]);
                    event.target.value = "";
                }}
            />
            {previews.length > 0 && (
                <div className="photo-strip">
                    {previews.map(({ file, url }) => (
                        <PhotoFrame
                            key={url}
                            src={url}
                            alt={file.name}
                            caption={file.name}
                        >
                            <Button
                                type="button"
                                size="icon-xs"
                                variant="secondary"
                                className="photo-action"
                                onClick={() =>
                                    onChange(value.filter((f) => f !== file))
                                }
                                aria-label={`Remove ${file.name}`}
                            >
                                <XIcon />
                            </Button>
                        </PhotoFrame>
                    ))}
                </div>
            )}
        </div>
    );
};
