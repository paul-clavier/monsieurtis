import {
    createSetup,
    deleteSetupPhoto,
    setupKeys,
    tagKeys,
    uploadSetupPhoto,
} from "@/api/setups";
import type { SetupCreateDTO } from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CreateSetupVariables {
    setup: SetupCreateDTO;
    photos: File[];
}

export interface CreateSetupResult {
    id: string;
    failedPhotos: File[];
}

export const useCreateSetup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            setup,
            photos,
        }: CreateSetupVariables): Promise<CreateSetupResult> => {
            const { id } = await createSetup(setup);
            const uploads = await Promise.allSettled(
                photos.map((photo) => uploadSetupPhoto(id, photo)),
            );
            return {
                id,
                failedPhotos: photos.filter(
                    (_, index) => uploads[index]?.status === "rejected",
                ),
            };
        },
        onSettled: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: setupKeys.all }),
                queryClient.invalidateQueries({ queryKey: tagKeys.all }),
            ]),
    });
};

export const useUploadSetupPhotos = (setupId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (files: File[]) =>
            Promise.all(files.map((file) => uploadSetupPhoto(setupId, file))),
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: setupKeys.all }),
    });
};

export const useDeleteSetupPhoto = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => deleteSetupPhoto(photoId),
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: setupKeys.all }),
    });
};
