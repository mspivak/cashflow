import type {
  Category,
  Plan,
  PlanCreate,
  PlanUpdate,
  Entry,
  EntryCreate,
  EntryUpdate,
  Setting,
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

export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/categories`)
  return handleResponse<Category[]>(response)
}

export async function createCategory(category: Omit<Category, "id">): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  })
  return handleResponse<Category>(response)
}

export async function fetchPlans(status?: string, categoryId?: string): Promise<Plan[]> {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (categoryId) params.set("category_id", categoryId)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/plans${query}`)
  return handleResponse<Plan[]>(response)
}

export async function createPlan(plan: PlanCreate): Promise<Plan> {
  const response = await fetch(`${API_BASE}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })
  return handleResponse<Plan>(response)
}

export async function updatePlan(id: string, plan: PlanUpdate): Promise<Plan> {
  const response = await fetch(`${API_BASE}/plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })
  return handleResponse<Plan>(response)
}

export async function deletePlan(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/plans/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

export async function fetchEntries(fromMonth?: string, toMonth?: string, planId?: string): Promise<Entry[]> {
  const params = new URLSearchParams()
  if (fromMonth) params.set("from_month", fromMonth)
  if (toMonth) params.set("to_month", toMonth)
  if (planId) params.set("plan_id", planId)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/entries${query}`)
  return handleResponse<Entry[]>(response)
}

export async function createEntry(entry: EntryCreate): Promise<Entry> {
  const response = await fetch(`${API_BASE}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  })
  return handleResponse<Entry>(response)
}

export async function updateEntry(id: string, entry: EntryUpdate): Promise<Entry> {
  const response = await fetch(`${API_BASE}/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  })
  return handleResponse<Entry>(response)
}

export async function deleteEntry(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/entries/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

export async function fetchSettings(): Promise<Setting[]> {
  const response = await fetch(`${API_BASE}/settings`)
  return handleResponse<Setting[]>(response)
}

export async function updateSetting(key: string, value: string): Promise<Setting> {
  const response = await fetch(`${API_BASE}/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  })
  return handleResponse<Setting>(response)
}
