import { createView, deleteView, viewKeys } from "@/api/setups";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateView = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createView,
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: viewKeys.all }),
    });
};

export const useDeleteView = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteView,
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: viewKeys.all }),
    });
};
