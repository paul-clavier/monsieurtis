import { photoUrl } from "@/api/setups";
import { formatDuration } from "@/utils/format";
import type { SetupWithPhotos } from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import { Link } from "@tanstack/react-router";
import { ClockIcon } from "lucide-react";
import { PhotoFrame } from "./photo-frame";

export const SetupPreview = ({ setup }: { setup: SetupWithPhotos }) => {
    const cover = setup.photos[0];

    return (
        <Link
            to="/setups/$setupId"
            params={{ setupId: setup.id }}
            className="setup-preview"
        >
            <PhotoFrame
                src={cover ? photoUrl(cover) : undefined}
                alt={setup.label}
                className="setup-preview-photo"
            />
            <span className="setup-preview-body">
                <span className="setup-preview-title">{setup.label}</span>
                <span className="setup-preview-meta">
                    <ClockIcon />
                    {formatDuration(setup.time)}
                </span>
            </span>
        </Link>
    );
};
