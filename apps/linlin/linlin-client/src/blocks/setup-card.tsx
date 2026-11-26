import type { SetupWithTagsAndPhotosAndSubSetupsAndParentSetups } from "@/api/setups";
import { photoUrl } from "@/api/setups";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@monsieurtis/ui/components/card";
import { Link } from "@tanstack/react-router";
import { PhotoFrame } from "./components/photo-frame";
import { SetupMeta } from "./components/setup-meta";
import { TagGroups } from "./components/tag-groups";

interface SetupCardProps {
    setup: SetupWithTagsAndPhotosAndSubSetupsAndParentSetups;
}

export const SetupCard = ({ setup }: SetupCardProps) => {
    const cover = setup.photos[0];
    const isRoot = setup.parentSetups.length === 0;

    return (
        <Link
            to="/setups/$setupId"
            params={{ setupId: setup.id }}
            className="setup-card-link"
        >
            <Card className="setup-tile h-full">
                <PhotoFrame
                    src={cover ? photoUrl(cover) : undefined}
                    alt={setup.label}
                >
                    {isRoot && (
                        <span
                            className="root-tag"
                            title="Not part of another setup"
                        >
                            Root
                        </span>
                    )}
                </PhotoFrame>
                <CardHeader>
                    <CardTitle>{setup.label}</CardTitle>
                    {setup.description && (
                        <CardDescription className="line-clamp-2">
                            {setup.description}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="mt-auto">
                    <SetupMeta
                        setup={setup}
                        componentCount={setup.subSetups.length}
                    />
                </CardContent>
                {setup.tags.length > 0 && (
                    <CardContent>
                        <TagGroups tags={setup.tags} />
                    </CardContent>
                )}
            </Card>
        </Link>
    );
};
