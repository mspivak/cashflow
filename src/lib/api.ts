import type {
  Category,
  Plan,
  PlanCreate,
  PlanUpdate,
  Entry,
  EntryCreate,
  EntryUpdate,
  Setting,
  User,
  Cashflow,
  CashflowCreate,
  CashflowUpdate,
  CashflowMember,
  MemberRole,
  PublicCashflow,
  LocalCashflow,
} from "@/types"

const API_BASE = "/api"

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include" })
  return handleResponse<User>(response)
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  })
  return handleResponse<void>(response)
}

export function loginWithGoogle(): void {
  window.location.href = `${API_BASE}/auth/login/google`
}

export function loginWithGithub(): void {
  window.location.href = `${API_BASE}/auth/login/github`
}

export async function fetchCashflows(): Promise<Cashflow[]> {
  const response = await fetch(`${API_BASE}/cashflows`, { credentials: "include" })
  return handleResponse<Cashflow[]>(response)
}

export async function createCashflow(cashflow: CashflowCreate): Promise<Cashflow> {
  const response = await fetch(`${API_BASE}/cashflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(cashflow),
  })
  return handleResponse<Cashflow>(response)
}

export async function updateCashflow(id: string, cashflow: CashflowUpdate): Promise<Cashflow> {
  const response = await fetch(`${API_BASE}/cashflows/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(cashflow),
  })
  return handleResponse<Cashflow>(response)
}

export async function deleteCashflow(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cashflows/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  return handleResponse<void>(response)
}

export async function fetchCashflowMembers(cashflowId: string): Promise<CashflowMember[]> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/members`, { credentials: "include" })
  return handleResponse<CashflowMember[]>(response)
}

export async function inviteMember(cashflowId: string, email: string, role: MemberRole): Promise<CashflowMember> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, role }),
  })
  return handleResponse<CashflowMember>(response)
}

export async function updateMemberRole(cashflowId: string, userId: string, role: MemberRole): Promise<void> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/members/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  })
  return handleResponse<void>(response)
}

export async function removeMember(cashflowId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
  })
  return handleResponse<void>(response)
}

export async function fetchCategories(cashflowId: string): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/categories`, { credentials: "include" })
  return handleResponse<Category[]>(response)
}

export async function createCategory(cashflowId: string, category: Omit<Category, "id" | "cashflow_id">): Promise<Category> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(category),
  })
  return handleResponse<Category>(response)
}

export async function fetchPlans(cashflowId: string, status?: string, categoryId?: string): Promise<Plan[]> {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (categoryId) params.set("category_id", categoryId)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/plans${query}`, { credentials: "include" })
  return handleResponse<Plan[]>(response)
}

export async function createPlan(cashflowId: string, plan: PlanCreate): Promise<Plan> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(plan),
  })
  return handleResponse<Plan>(response)
}

export async function updatePlan(cashflowId: string, id: string, plan: PlanUpdate): Promise<Plan> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(plan),
  })
  return handleResponse<Plan>(response)
}

export async function deletePlan(cashflowId: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  return handleResponse<void>(response)
}

export async function fetchEntries(cashflowId: string, fromMonth?: string, toMonth?: string, planId?: string): Promise<Entry[]> {
  const params = new URLSearchParams()
  if (fromMonth) params.set("from_month", fromMonth)
  if (toMonth) params.set("to_month", toMonth)
  if (planId) params.set("plan_id", planId)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/entries${query}`, { credentials: "include" })
  return handleResponse<Entry[]>(response)
}

export async function createEntry(cashflowId: string, entry: EntryCreate): Promise<Entry> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(entry),
  })
  return handleResponse<Entry>(response)
}

export async function updateEntry(cashflowId: string, id: string, entry: EntryUpdate): Promise<Entry> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(entry),
  })
  return handleResponse<Entry>(response)
}

export async function deleteEntry(cashflowId: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/entries/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  return handleResponse<void>(response)
}

export async function fetchSettings(cashflowId: string): Promise<Setting[]> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/settings`, { credentials: "include" })
  return handleResponse<Setting[]>(response)
}

export async function updateSetting(cashflowId: string, key: string, value: string): Promise<Setting> {
  const response = await fetch(`${API_BASE}/cashflows/${cashflowId}/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ value }),
  })
  return handleResponse<Setting>(response)
}

export async function updateCashflowShareSettings(id: string, isPublic: boolean): Promise<Cashflow> {
  const response = await fetch(`${API_BASE}/cashflows/${id}/share`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ is_public: isPublic }),
  })
  return handleResponse<Cashflow>(response)
}

export async function importCashflow(data: LocalCashflow): Promise<Cashflow> {
  const response = await fetch(`${API_BASE}/cashflows/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      categories: data.categories,
      plans: data.plans,
      entries: data.entries,
      settings: data.settings,
    }),
  })
  return handleResponse<Cashflow>(response)
}

export async function fetchPublicCashflow(shareId: string): Promise<PublicCashflow> {
  const response = await fetch(`${API_BASE}/public/${shareId}`)
  return handleResponse<PublicCashflow>(response)
}

export async function fetchPublicCategories(shareId: string): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/public/${shareId}/categories`)
  return handleResponse<Category[]>(response)
}

export async function createPublicCategory(shareId: string, category: Omit<Category, "id" | "cashflow_id">): Promise<Category> {
  const response = await fetch(`${API_BASE}/public/${shareId}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  })
  return handleResponse<Category>(response)
}

export async function fetchPublicPlans(shareId: string, status?: string, categoryId?: string): Promise<Plan[]> {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (categoryId) params.set("category_id", categoryId)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/public/${shareId}/plans${query}`)
  return handleResponse<Plan[]>(response)
}

export async function createPublicPlan(shareId: string, plan: PlanCreate): Promise<Plan> {
  const response = await fetch(`${API_BASE}/public/${shareId}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })
  return handleResponse<Plan>(response)
}

export async function updatePublicPlan(shareId: string, id: string, plan: PlanUpdate): Promise<Plan> {
  const response = await fetch(`${API_BASE}/public/${shareId}/plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })
  return handleResponse<Plan>(response)
}

export async function deletePublicPlan(shareId: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/public/${shareId}/plans/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

export async function fetchPublicEntries(shareId: string, fromMonth?: string, toMonth?: string, planId?: string): Promise<Entry[]> {
  const params = new URLSearchParams()
  if (fromMonth) params.set("from_month", fromMonth)
  if (toMonth) params.set("to_month", toMonth)
  if (planId) params.set("plan_id", planId)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/public/${shareId}/entries${query}`)
  return handleResponse<Entry[]>(response)
}

export async function createPublicEntry(shareId: string, entry: EntryCreate): Promise<Entry> {
  const response = await fetch(`${API_BASE}/public/${shareId}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  })
  return handleResponse<Entry>(response)
}

export async function updatePublicEntry(shareId: string, id: string, entry: EntryUpdate): Promise<Entry> {
  const response = await fetch(`${API_BASE}/public/${shareId}/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  })
  return handleResponse<Entry>(response)
}

export async function deletePublicEntry(shareId: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/public/${shareId}/entries/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

export async function fetchPublicSettings(shareId: string): Promise<Setting[]> {
  const response = await fetch(`${API_BASE}/public/${shareId}/settings`)
  return handleResponse<Setting[]>(response)
}

export async function updatePublicSetting(shareId: string, key: string, value: string): Promise<Setting> {
  const response = await fetch(`${API_BASE}/public/${shareId}/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  })
  return handleResponse<Setting>(response)
}
