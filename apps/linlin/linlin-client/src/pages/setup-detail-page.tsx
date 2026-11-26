import { setupQueryOptions } from "@/api/setups";
import { SetupMeta } from "@/blocks/components/setup-meta";
import { TagGroups } from "@/blocks/components/tag-groups";
import { PhotoGallery } from "@/blocks/photo-gallery";
import { formatDuration } from "@/utils/format";
import type { Setup } from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import { Button } from "@monsieurtis/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

const route = getRouteApi("/setups/$setupId");

const SetupLinks = ({ title, setups }: { title: string; setups: Setup[] }) =>
    setups.length === 0 ? null : (
        <section>
            <h2 className="form-section-title">{title}</h2>
            <ul className="setup-links">
                {setups.map((setup) => (
                    <li key={setup.id}>
                        <Link
                            to="/setups/$setupId"
                            params={{ setupId: setup.id }}
                        >
                            <span>{setup.label}</span>
                            <span className="leader" />
                            <span className="text-muted-foreground">
                                {formatDuration(setup.time)}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );

export const SetupDetailPage = () => {
    const { setupId } = route.useParams();
    const { data: setup } = useSuspenseQuery(setupQueryOptions(setupId));
    const isRoot = setup.parentSetups.length === 0;

    return (
        <div className="flex flex-col gap-6">
            <Button variant="link" className="self-start px-0" asChild>
                <Link to="/">
                    <ArrowLeftIcon />
                    Back to the index
                </Link>
            </Button>
            <article className="surface sheet">
                <header className="flex flex-col items-center gap-4 text-center">
                    {isRoot && (
                        <span className="root-tag mx-auto">Root setup</span>
                    )}
                    <h1 className="heading">{setup.label}</h1>
                    <p className="font-mono text-xs text-muted-foreground">
                        {setup.name}
                    </p>
                    <SetupMeta
                        setup={setup}
                        componentCount={setup.subSetups.length}
                        className="justify-center"
                    />
                    {setup.tags.length > 0 && (
                        <TagGroups
                            tags={setup.tags}
                            linked
                            className="justify-center"
                        />
                    )}
                </header>

                <div className="mt-8 grid gap-10 md:grid-cols-[1fr_16rem]">
                    <div className="flex flex-col gap-8">
                        <section>
                            <h2 className="form-section-title">Method</h2>
                            <p className="prose-body">
                                {setup.description ||
                                    "No method written down yet."}
                            </p>
                        </section>
                        {setup.dressing && (
                            <section>
                                <h2 className="form-section-title">Dressing</h2>
                                <p className="prose-body">{setup.dressing}</p>
                            </section>
                        )}
                        <PhotoGallery
                            setupId={setup.id}
                            label={setup.label}
                            photos={setup.photos}
                        />
                    </div>
                    <aside className="flex flex-col gap-8">
                        {setup.ingredients.length > 0 && (
                            <section>
                                <h2 className="form-section-title">
                                    Ingredients
                                </h2>
                                <ul className="setup-links">
                                    {setup.ingredients.map((item) => (
                                        <li key={item.ingredientId}>
                                            <span>{item.ingredient.label}</span>
                                            <span className="leader" />
                                            <span className="text-muted-foreground">
                                                {item.quantity} {item.unit}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        <SetupLinks
                            title="Made with"
                            setups={setup.subSetups}
                        />
                        <SetupLinks
                            title="Used in"
                            setups={setup.parentSetups}
                        />
                    </aside>
                </div>
            </article>
        </div>
    );
};
