import type { SetupPhoto } from "@monsieurtis/linlin-interfaces/domain/setup-photo.entity";
import type {
    SetupScope,
    SetupView,
    TagMatch,
} from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";
import type {
    Setup,
    SetupRelations,
} from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import type { SetupViewCreateDTO } from "@monsieurtis/linlin-interfaces/dto/setup-view.dto";
import type { SetupCreateDTO } from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { queryOptions } from "@tanstack/react-query";
import { request, toQueryString } from "./http";

export type { SetupScope, TagMatch };

export interface SetupListParams {
    q?: string;
    tags?: string[];
    match?: TagMatch;
    scope?: SetupScope;
}

export type SetupWithTagsAndPhotosAndSubSetupsAndParentSetups = Setup &
    Pick<SetupRelations, "tags" | "photos" | "subSetups" | "parentSetups">;

const CARD_INCLUDE = "tags,photos,subSetups,parentSetups";
const DETAIL_INCLUDE = "tags,photos,subSetups,parentSetups,ingredients";

const ROOT_FILTER: Record<SetupScope, string | undefined> = {
    all: undefined,
    root: "true",
    nested: "false",
};

const normalize = (params: SetupListParams) => ({
    q: params.q?.trim() || undefined,
    tags: [...(params.tags ?? [])].sort(),
    match: params.match ?? "any",
    scope: params.scope ?? "all",
});

export const setupKeys = {
    all: ["setups"] as const,
    lists: () => [...setupKeys.all, "list"] as const,
    list: (params: SetupListParams) =>
        [...setupKeys.lists(), normalize(params)] as const,
    options: () => [...setupKeys.all, "options"] as const,
    detail: (id: string) => [...setupKeys.all, "detail", id] as const,
};

export const tagKeys = { all: ["tags"] as const };

export const setupListQueryOptions = (params: SetupListParams) => {
    const { q, tags, match, scope } = normalize(params);
    const tagFilter = match === "all" ? "filters[tagsAll]" : "filters[tagsAny]";
    return queryOptions({
        queryKey: setupKeys.list(params),
        queryFn: () =>
            request<SetupWithTagsAndPhotosAndSubSetupsAndParentSetups[]>(
                `/setups${toQueryString({
                    "filters[search]": q,
                    [tagFilter]: tags.length > 0 ? tags.join(",") : undefined,
                    "filters[root]": ROOT_FILTER[scope],
                    include: CARD_INCLUDE,
                    sort: "label:ASC",
                })}`,
            ),
    });
};

export const setupOptionsQueryOptions = () =>
    queryOptions({
        queryKey: setupKeys.options(),
        queryFn: () =>
            request<Setup[]>(`/setups${toQueryString({ sort: "label:ASC" })}`),
    });

export const setupQueryOptions = (id: string) =>
    queryOptions({
        queryKey: setupKeys.detail(id),
        queryFn: () =>
            request<Setup & SetupRelations>(
                `/setups/${id}${toQueryString({ include: DETAIL_INCLUDE })}`,
            ),
    });

export const tagsQueryOptions = () =>
    queryOptions({
        queryKey: tagKeys.all,
        queryFn: () => request<Tag[]>("/tags"),
        staleTime: 5 * 60_000,
    });

export const viewKeys = { all: ["setup-views"] as const };

export const viewsQueryOptions = () =>
    queryOptions({
        queryKey: viewKeys.all,
        queryFn: () =>
            request<SetupView[]>(
                `/setup-views${toQueryString({ sort: "name:ASC" })}`,
            ),
    });

export const createView = (data: SetupViewCreateDTO) =>
    request<{ id: string }>("/setup-views", { method: "POST", json: data });

export const deleteView = (id: string) =>
    request<{ id: string }>(`/setup-views/${id}`, { method: "DELETE" });

export const createSetup = (data: SetupCreateDTO) =>
    request<{ id: string }>("/setups", { method: "POST", json: data });

export const uploadSetupPhoto = (setupId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<SetupPhoto>(`/setups/${setupId}/photos`, {
        method: "POST",
        body,
    });
};

export const deleteSetupPhoto = (photoId: string) =>
    request<{ id: string }>(`/photos/${photoId}`, { method: "DELETE" });

export const photoUrl = (photo: Pick<SetupPhoto, "id">) =>
    `/api/photos/${photo.id}/file`;
