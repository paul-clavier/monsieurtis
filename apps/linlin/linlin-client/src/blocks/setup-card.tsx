import type { SetupWithTagsAndPhotosAndSubSetupsAndParentSetups } from "@/api/setups";
import { photoUrl } from "@/api/setups";
import { Badge } from "@monsieurtis/ui/components/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@monsieurtis/ui/components/card";
import { Link } from "@tanstack/react-router";
import { Polaroid } from "./components/polaroid";
import { SetupMeta } from "./components/setup-meta";

interface SetupCardProps {
    setup: SetupWithTagsAndPhotosAndSubSetupsAndParentSetups;
    index: number;
}

export const SetupCard = ({ setup, index }: SetupCardProps) => {
    const cover = setup.photos[0];
    const isRoot = setup.parentSetups.length === 0;

    return (
        <Link
            to="/setups/$setupId"
            params={{ setupId: setup.id }}
            className="setup-card-link"
        >
            <Card className="recipe-card h-full">
                <Polaroid
                    src={cover ? photoUrl(cover) : undefined}
                    alt={setup.label}
                    tilt={index % 2 === 0 ? "left" : "right"}
                    className="mx-5 -mt-1"
                />
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <CardTitle className="cookbook-heading text-2xl leading-tight">
                            {setup.label}
                        </CardTitle>
                        {isRoot && (
                            <span
                                className="stamp"
                                title="Not part of another setup"
                            >
                                Root
                            </span>
                        )}
                    </div>
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
                    <CardFooter className="flex-wrap gap-1.5">
                        {setup.tags.map((tag) => (
                            <Badge key={tag.name} variant="outline">
                                {tag.name}
                            </Badge>
                        ))}
                    </CardFooter>
                )}
            </Card>
        </Link>
    );
};
