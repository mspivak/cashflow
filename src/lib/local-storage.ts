import type { LocalCashflow, Category, LocalPlan, LocalEntry, Setting, Frequency } from "@/types"

const LOCAL_CASHFLOW_KEY = "cashflow_anonymous_data"
const PENDING_IMPORT_KEY = "cashflow_pending_import"

let cachedCashflow: LocalCashflow | null = null
let cachedRawJson: string | null = null

const DEFAULT_CATEGORIES: Omit<Category, "cashflow_id">[] = [
  { id: crypto.randomUUID(), name: "Salary", type: "income", icon: "💼", color: "#22c55e" },
  { id: crypto.randomUUID(), name: "Freelance", type: "income", icon: "💻", color: "#10b981" },
  { id: crypto.randomUUID(), name: "Rental", type: "income", icon: "🏠", color: "#14b8a6" },
  { id: crypto.randomUUID(), name: "Other Income", type: "income", icon: "💰", color: "#06b6d4" },
  { id: crypto.randomUUID(), name: "Housing", type: "expense", icon: "🏡", color: "#ef4444" },
  { id: crypto.randomUUID(), name: "Utilities", type: "expense", icon: "⚡", color: "#f97316" },
  { id: crypto.randomUUID(), name: "Groceries", type: "expense", icon: "🛒", color: "#f59e0b" },
  { id: crypto.randomUUID(), name: "Transport", type: "expense", icon: "🚗", color: "#eab308" },
  { id: crypto.randomUUID(), name: "Subscriptions", type: "expense", icon: "📺", color: "#84cc16" },
  { id: crypto.randomUUID(), name: "Other Expense", type: "expense", icon: "💸", color: "#64748b" },
]

export function generateLocalId(): string {
  return crypto.randomUUID()
}

export function createEmptyLocalCashflow(): LocalCashflow {
  const now = new Date().toISOString()
  return {
    id: generateLocalId(),
    name: "My Budget",
    description: undefined,
    categories: DEFAULT_CATEGORIES as Category[],
    plans: [],
    entries: [],
    settings: [{ key: "starting_balance", value: "0" }],
    created_at: now,
    updated_at: now,
  }
}

export function getLocalCashflow(): LocalCashflow | null {
  const data = localStorage.getItem(LOCAL_CASHFLOW_KEY)
  if (!data) {
    cachedCashflow = null
    cachedRawJson = null
    return null
  }
  if (data === cachedRawJson && cachedCashflow) {
    return cachedCashflow
  }
  cachedRawJson = data
  cachedCashflow = JSON.parse(data)
  return cachedCashflow
}

export function saveLocalCashflow(cashflow: LocalCashflow): void {
  cashflow.updated_at = new Date().toISOString()
  const json = JSON.stringify(cashflow)
  localStorage.setItem(LOCAL_CASHFLOW_KEY, json)
  cachedRawJson = json
  cachedCashflow = JSON.parse(json)
}

export function clearLocalCashflow(): void {
  localStorage.removeItem(LOCAL_CASHFLOW_KEY)
  cachedCashflow = null
  cachedRawJson = null
}

export function getOrCreateLocalCashflow(): LocalCashflow {
  const existing = getLocalCashflow()
  if (existing) return existing
  const newCashflow = createEmptyLocalCashflow()
  saveLocalCashflow(newCashflow)
  return newCashflow
}

export function setPendingImport(pending: boolean): void {
  if (pending) {
    localStorage.setItem(PENDING_IMPORT_KEY, "true")
  } else {
    localStorage.removeItem(PENDING_IMPORT_KEY)
  }
}

export function hasPendingImport(): boolean {
  return localStorage.getItem(PENDING_IMPORT_KEY) === "true"
}

export function addLocalCategory(category: Omit<Category, "id" | "cashflow_id">): Category {
  const cashflow = getOrCreateLocalCashflow()
  const newCategory: Category = {
    ...category,
    id: generateLocalId(),
  }
  cashflow.categories.push(newCategory)
  saveLocalCashflow(cashflow)
  return newCategory
}

export function addLocalPlan(plan: {
  category_id: string
  name: string
  expected_amount: number
  frequency: Frequency
  expected_day?: number
  start_month: string
  end_month?: string
  notes?: string
}): LocalPlan {
  const cashflow = getOrCreateLocalCashflow()
  const now = new Date().toISOString()
  const newPlan: LocalPlan = {
    id: generateLocalId(),
    category_id: plan.category_id,
    name: plan.name,
    expected_amount: plan.expected_amount,
    frequency: plan.frequency,
    expected_day: plan.expected_day,
    start_month: plan.start_month,
    end_month: plan.end_month,
    status: "active",
    notes: plan.notes,
    created_at: now,
    updated_at: now,
  }
  cashflow.plans.push(newPlan)
  saveLocalCashflow(cashflow)
  return newPlan
}

export function updateLocalPlan(id: string, updates: Partial<LocalPlan>): LocalPlan | null {
  const cashflow = getOrCreateLocalCashflow()
  const index = cashflow.plans.findIndex((p) => p.id === id)
  if (index === -1) return null
  cashflow.plans[index] = {
    ...cashflow.plans[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  saveLocalCashflow(cashflow)
  return cashflow.plans[index]
}

export function deleteLocalPlan(id: string): void {
  const cashflow = getOrCreateLocalCashflow()
  cashflow.plans = cashflow.plans.filter((p) => p.id !== id)
  cashflow.entries = cashflow.entries.filter((e) => e.plan_id !== id)
  saveLocalCashflow(cashflow)
}

export function addLocalEntry(entry: {
  plan_id: string
  month_year: string
  amount: number
  date?: string
  notes?: string
}): LocalEntry {
  const cashflow = getOrCreateLocalCashflow()
  const now = new Date().toISOString()
  const newEntry: LocalEntry = {
    id: generateLocalId(),
    plan_id: entry.plan_id,
    month_year: entry.month_year,
    amount: entry.amount,
    date: entry.date,
    notes: entry.notes,
    created_at: now,
  }
  cashflow.entries.push(newEntry)

  const plan = cashflow.plans.find((p) => p.id === entry.plan_id)
  if (plan && plan.frequency === "one-time") {
    plan.status = "completed"
    plan.updated_at = now
  }

  saveLocalCashflow(cashflow)
  return newEntry
}

export function updateLocalEntry(id: string, updates: Partial<LocalEntry>): LocalEntry | null {
  const cashflow = getOrCreateLocalCashflow()
  const index = cashflow.entries.findIndex((e) => e.id === id)
  if (index === -1) return null
  cashflow.entries[index] = {
    ...cashflow.entries[index],
    ...updates,
  }
  saveLocalCashflow(cashflow)
  return cashflow.entries[index]
}

export function deleteLocalEntry(id: string): void {
  const cashflow = getOrCreateLocalCashflow()
  cashflow.entries = cashflow.entries.filter((e) => e.id !== id)
  saveLocalCashflow(cashflow)
}

export function updateLocalSetting(key: string, value: string): Setting {
  const cashflow = getOrCreateLocalCashflow()
  const index = cashflow.settings.findIndex((s) => s.key === key)
  if (index === -1) {
    cashflow.settings.push({ key, value })
  } else {
    cashflow.settings[index] = { key, value }
  }
  saveLocalCashflow(cashflow)
  return { key, value }
}

export function updateLocalCashflowName(name: string, description?: string): void {
  const cashflow = getOrCreateLocalCashflow()
  cashflow.name = name
  cashflow.description = description
  saveLocalCashflow(cashflow)
}
