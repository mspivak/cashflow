export type CategoryType = "income" | "expense"
export type Frequency = "weekly" | "biweekly" | "monthly"
export type EntryStatus = "pending" | "confirmed" | "unplanned"

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon?: string
  color?: string
}

export interface Milestone {
  id: string
  entry_id: string
  name: string
  expected_amount?: number
  expected_date?: string
  actual_amount?: number
  actual_date?: string
  sort_order: number
  created_at: string
}

export interface MilestoneCreate {
  name: string
  expected_amount?: number
  expected_date?: string
  actual_amount?: number
  actual_date?: string
  sort_order?: number
}

export interface Entry {
  id: string
  category_id: string
  recurring_id?: string
  name: string
  month_year: string
  expected_amount?: number
  expected_date?: string
  actual_amount?: number
  actual_date?: string
  has_milestones: boolean
  notes?: string
  created_at: string
  updated_at: string
  category: Category
  milestones: Milestone[]
}

export interface EntryCreate {
  category_id: string
  recurring_id?: string
  name: string
  month_year: string
  expected_amount?: number
  expected_date?: string
  actual_amount?: number
  actual_date?: string
  has_milestones?: boolean
  notes?: string
  milestones?: MilestoneCreate[]
}

export interface EntryUpdate {
  category_id?: string
  name?: string
  month_year?: string
  expected_amount?: number
  expected_date?: string
  actual_amount?: number
  actual_date?: string
  notes?: string
}

export interface Recurring {
  id: string
  category_id: string
  name: string
  expected_amount: number
  frequency: Frequency
  start_month: string
  end_month?: string
  created_at: string
  category: Category
}

export interface RecurringCreate {
  category_id: string
  name: string
  expected_amount: number
  frequency: Frequency
  start_month: string
  end_month?: string
}

export interface Setting {
  key: string
  value: string
}

export interface MonthData {
  id: string // "2025-01"
  name: string // "Jan 2025"
  entries: Entry[]
  expectedBalance: number
  actualBalance: number
  cumulativeExpected: number
  cumulativeActual: number
}

// Helper to determine entry status
export function getEntryStatus(entry: Entry): EntryStatus {
  if (entry.actual_amount !== null && entry.actual_amount !== undefined) {
    return "confirmed"
  }
  if (entry.expected_amount === null || entry.expected_amount === undefined) {
    return "unplanned"
  }
  return "pending"
}

// Helper to get display amount (actual if confirmed, expected otherwise)
export function getDisplayAmount(entry: Entry): number {
  return entry.actual_amount ?? entry.expected_amount ?? 0
}
