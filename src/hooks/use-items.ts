import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { EntryCreate, EntryUpdate, RecurringCreate, Category } from "@/types"

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: api.fetchCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (category: Omit<Category, "id">) => api.createCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}

// Entries
export function useEntries(fromMonth?: string, toMonth?: string) {
  return useQuery({
    queryKey: ["entries", fromMonth, toMonth],
    queryFn: () => api.fetchEntries(fromMonth, toMonth),
  })
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entry: EntryCreate) => api.createEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: EntryUpdate }) =>
      api.updateEntry(id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })
}

export function useConfirmEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data?: { actual_amount?: number; actual_date?: string }
    }) => api.confirmEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })
}

// Recurring
export function useRecurring() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: api.fetchRecurring,
  })
}

export function useCreateRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recurring: RecurringCreate) => api.createRecurring(recurring),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] })
    },
  })
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, recurring }: { id: string; recurring: Partial<RecurringCreate> }) =>
      api.updateRecurring(id, recurring),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] })
    },
  })
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteRecurring(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] })
    },
  })
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.fetchSettings,
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
