import type {
  Category,
  Entry,
  EntryCreate,
  EntryUpdate,
  Recurring,
  RecurringCreate,
  Setting,
  MilestoneCreate,
  Milestone,
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

// Categories API
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

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  })
  return handleResponse<Category>(response)
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

// Entries API
export async function fetchEntries(fromMonth?: string, toMonth?: string): Promise<Entry[]> {
  const params = new URLSearchParams()
  if (fromMonth) params.set("from_month", fromMonth)
  if (toMonth) params.set("to_month", toMonth)
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

export async function confirmEntry(
  id: string,
  data?: { actual_amount?: number; actual_date?: string }
): Promise<Entry> {
  const response = await fetch(`${API_BASE}/entries/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  })
  return handleResponse<Entry>(response)
}

// Milestones API
export async function addMilestone(entryId: string, milestone: MilestoneCreate): Promise<Milestone> {
  const response = await fetch(`${API_BASE}/entries/${entryId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(milestone),
  })
  return handleResponse<Milestone>(response)
}

export async function updateMilestone(
  entryId: string,
  milestoneId: string,
  milestone: MilestoneCreate
): Promise<Milestone> {
  const response = await fetch(`${API_BASE}/entries/${entryId}/milestones/${milestoneId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(milestone),
  })
  return handleResponse<Milestone>(response)
}

export async function deleteMilestone(entryId: string, milestoneId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/entries/${entryId}/milestones/${milestoneId}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

// Recurring API
export async function fetchRecurring(): Promise<Recurring[]> {
  const response = await fetch(`${API_BASE}/recurring`)
  return handleResponse<Recurring[]>(response)
}

export async function createRecurring(recurring: RecurringCreate): Promise<Recurring> {
  const response = await fetch(`${API_BASE}/recurring`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recurring),
  })
  return handleResponse<Recurring>(response)
}

export async function updateRecurring(id: string, recurring: Partial<RecurringCreate>): Promise<Recurring> {
  const response = await fetch(`${API_BASE}/recurring/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recurring),
  })
  return handleResponse<Recurring>(response)
}

export async function deleteRecurring(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/recurring/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

// Settings API
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
