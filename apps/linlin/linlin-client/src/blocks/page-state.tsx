import { ApiError } from "@/api/http";
import { Button } from "@monsieurtis/ui/components/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@monsieurtis/ui/components/empty";
import { Skeleton } from "@monsieurtis/ui/components/skeleton";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { CookingPotIcon } from "lucide-react";
import { useEffect } from "react";

export const PageError = ({ error, reset }: ErrorComponentProps) => {
    const router = useRouter();
    const queryErrorResetBoundary = useQueryErrorResetBoundary();

    useEffect(() => {
        queryErrorResetBoundary.reset();
    }, [queryErrorResetBoundary]);

    const notFound = error instanceof ApiError && error.status === 404;

    return (
        <Empty className="paper-card mx-auto mt-10 max-w-lg">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <CookingPotIcon />
                </EmptyMedia>
                <EmptyTitle className="cookbook-heading text-2xl">
                    {notFound
                        ? "This page fell out of the book"
                        : "Something burnt"}
                </EmptyTitle>
                <EmptyDescription>{error.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
                <Button variant="outline" asChild>
                    <Link to="/">Back to the index</Link>
                </Button>
                {!notFound && (
                    <Button
                        onClick={() => {
                            reset();
                            void router.invalidate();
                        }}
                    >
                        Try again
                    </Button>
                )}
            </EmptyContent>
        </Empty>
    );
};

export const SetupsPagePending = () => (
    <div className="setup-grid">
        {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="paper-card flex flex-col gap-4 p-4">
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        ))}
    </div>
);
