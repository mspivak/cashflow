import type { Item, ItemCreate, Setting } from "@/types"

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

// Items API
export async function fetchItems(fromMonth?: string, toMonth?: string): Promise<Item[]> {
  const params = new URLSearchParams()
  if (fromMonth) params.set("from_month", fromMonth)
  if (toMonth) params.set("to_month", toMonth)
  const query = params.toString() ? `?${params}` : ""
  const response = await fetch(`${API_BASE}/items${query}`)
  return handleResponse<Item[]>(response)
}

export async function createItem(item: ItemCreate): Promise<Item> {
  const response = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  })
  return handleResponse<Item>(response)
}

export async function updateItem(id: string, item: Partial<ItemCreate>): Promise<Item> {
  const response = await fetch(`${API_BASE}/items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  })
  return handleResponse<Item>(response)
}

export async function deleteItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/items/${id}`, {
    method: "DELETE",
  })
  return handleResponse<void>(response)
}

export async function moveItem(id: string, monthYear: string): Promise<Item> {
  const response = await fetch(`${API_BASE}/items/${id}/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month_year: monthYear }),
  })
  return handleResponse<Item>(response)
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
