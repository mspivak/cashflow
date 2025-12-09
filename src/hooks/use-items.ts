import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { PlanCreate, PlanUpdate, EntryCreate, EntryUpdate, Category } from "@/types"

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

export function usePlans(status?: string, categoryId?: string) {
  return useQuery({
    queryKey: ["plans", status, categoryId],
    queryFn: () => api.fetchPlans(status, categoryId),
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plan: PlanCreate) => api.createPlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
    },
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: PlanUpdate }) =>
      api.updatePlan(id, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
      queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })
}

export function useEntries(fromMonth?: string, toMonth?: string, planId?: string) {
  return useQuery({
    queryKey: ["entries", fromMonth, toMonth, planId],
    queryFn: () => api.fetchEntries(fromMonth, toMonth, planId),
  })
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entry: EntryCreate) => api.createEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
      queryClient.invalidateQueries({ queryKey: ["plans"] })
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
