import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { PlanCreate, PlanUpdate, EntryCreate, EntryUpdate, Category, CashflowCreate, CashflowUpdate, MemberRole } from "@/types"

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.getCurrentUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.clear()
      window.location.href = "/login"
    },
  })
}

export function useCashflows() {
  return useQuery({
    queryKey: ["cashflows"],
    queryFn: api.fetchCashflows,
  })
}

export function useCreateCashflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cashflow: CashflowCreate) => api.createCashflow(cashflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] })
    },
    onError: (error) => {
      console.error("Failed to create cashflow:", error)
    },
  })
}

export function useUpdateCashflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cashflow }: { id: string; cashflow: CashflowUpdate }) =>
      api.updateCashflow(id, cashflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] })
    },
  })
}

export function useDeleteCashflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCashflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] })
    },
  })
}

export function useCashflowMembers(cashflowId: string) {
  return useQuery({
    queryKey: ["cashflows", cashflowId, "members"],
    queryFn: () => api.fetchCashflowMembers(cashflowId),
    enabled: !!cashflowId,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cashflowId, email, role }: { cashflowId: string; email: string; role: MemberRole }) =>
      api.inviteMember(cashflowId, email, role),
    onSuccess: (_, { cashflowId }) => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "members"] })
    },
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cashflowId, userId, role }: { cashflowId: string; userId: string; role: MemberRole }) =>
      api.updateMemberRole(cashflowId, userId, role),
    onSuccess: (_, { cashflowId }) => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "members"] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cashflowId, userId }: { cashflowId: string; userId: string }) =>
      api.removeMember(cashflowId, userId),
    onSuccess: (_, { cashflowId }) => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "members"] })
    },
  })
}

export function useCategories(cashflowId: string) {
  return useQuery({
    queryKey: ["cashflows", cashflowId, "categories"],
    queryFn: () => api.fetchCategories(cashflowId),
    enabled: !!cashflowId,
  })
}

export function useCreateCategory(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (category: Omit<Category, "id" | "cashflow_id">) => api.createCategory(cashflowId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "categories"] })
    },
  })
}

export function usePlans(cashflowId: string, status?: string, categoryId?: string) {
  return useQuery({
    queryKey: ["cashflows", cashflowId, "plans", status, categoryId],
    queryFn: () => api.fetchPlans(cashflowId, status, categoryId),
    enabled: !!cashflowId,
  })
}

export function useCreatePlan(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plan: PlanCreate) => api.createPlan(cashflowId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "plans"] })
    },
  })
}

export function useUpdatePlan(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: PlanUpdate }) =>
      api.updatePlan(cashflowId, id, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "plans"] })
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "entries"] })
    },
  })
}

export function useDeletePlan(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePlan(cashflowId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "plans"] })
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "entries"] })
    },
  })
}

export function useEntries(cashflowId: string, fromMonth?: string, toMonth?: string, planId?: string) {
  return useQuery({
    queryKey: ["cashflows", cashflowId, "entries", fromMonth, toMonth, planId],
    queryFn: () => api.fetchEntries(cashflowId, fromMonth, toMonth, planId),
    enabled: !!cashflowId,
  })
}

export function useCreateEntry(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entry: EntryCreate) => api.createEntry(cashflowId, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "entries"] })
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "plans"] })
    },
  })
}

export function useUpdateEntry(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: EntryUpdate }) =>
      api.updateEntry(cashflowId, id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "entries"] })
    },
  })
}

export function useDeleteEntry(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteEntry(cashflowId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "entries"] })
    },
  })
}

export function useSettings(cashflowId: string) {
  return useQuery({
    queryKey: ["cashflows", cashflowId, "settings"],
    queryFn: () => api.fetchSettings(cashflowId),
    enabled: !!cashflowId,
  })
}

export function useUpdateSetting(cashflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.updateSetting(cashflowId, key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows", cashflowId, "settings"] })
    },
  })
}
