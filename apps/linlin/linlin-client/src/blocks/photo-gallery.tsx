import { photoUrl } from "@/api/setups";
import {
    useDeleteSetupPhoto,
    useUploadSetupPhotos,
} from "@/hooks/use-setup-mutations";
import type { SetupPhoto } from "@monsieurtis/linlin-interfaces/domain/setup-photo.entity";
import { Button } from "@monsieurtis/ui/components/button";
import { ImagePlusIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { ACCEPTED_PHOTOS } from "./components/photo-picker";
import { Polaroid } from "./components/polaroid";

interface PhotoGalleryProps {
    setupId: string;
    label: string;
    photos: SetupPhoto[];
}

export const PhotoGallery = ({ setupId, label, photos }: PhotoGalleryProps) => {
    const input = useRef<HTMLInputElement>(null);
    const upload = useUploadSetupPhotos(setupId);
    const remove = useDeleteSetupPhoto();

    const onFiles = (files: FileList | null) => {
        const selected = Array.from(files ?? []);
        if (selected.length === 0) return;
        upload.mutate(selected, {
            onSuccess: () =>
                toast.success(`Pinned ${selected.length} photo(s)`),
            onError: (error) => toast.error(error.message),
        });
    };

    return (
        <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
                <h2 className="form-section-title m-0">Photos</h2>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={upload.isPending}
                    onClick={() => input.current?.click()}
                >
                    {upload.isPending ? (
                        <Loader2Icon className="animate-spin" />
                    ) : (
                        <ImagePlusIcon />
                    )}
                    Add photos
                </Button>
                <input
                    ref={input}
                    type="file"
                    accept={ACCEPTED_PHOTOS}
                    multiple
                    hidden
                    onChange={(event) => {
                        onFiles(event.target.files);
                        event.target.value = "";
                    }}
                />
            </div>
            {photos.length === 0 ? (
                <p className="cookbook-hand text-xl text-muted-foreground">
                    No snapshot yet: cook it and take one!
                </p>
            ) : (
                <div className="photo-strip">
                    {photos.map((photo, index) => (
                        <Polaroid
                            key={photo.id}
                            src={photoUrl(photo)}
                            alt={`${label}, photo ${index + 1}`}
                            tilt={index % 2 ? "right" : "left"}
                        >
                            <Button
                                size="icon-xs"
                                variant="secondary"
                                className="polaroid-action"
                                disabled={
                                    remove.isPending &&
                                    remove.variables === photo.id
                                }
                                onClick={() =>
                                    remove.mutate(photo.id, {
                                        onError: (error) =>
                                            toast.error(error.message),
                                    })
                                }
                                aria-label="Remove photo"
                            >
                                <Trash2Icon />
                            </Button>
                        </Polaroid>
                    ))}
                </div>
            )}
        </section>
    );
};
