import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { ItemCreate } from "@/types"

export function useItems(fromMonth?: string, toMonth?: string) {
  return useQuery({
    queryKey: ["items", fromMonth, toMonth],
    queryFn: () => api.fetchItems(fromMonth, toMonth),
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.fetchSettings,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (item: ItemCreate) => api.createItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, item }: { id: string; item: Partial<ItemCreate> }) =>
      api.updateItem(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}

export function useMoveItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, monthYear }: { id: string; monthYear: string }) =>
      api.moveItem(id, monthYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}
