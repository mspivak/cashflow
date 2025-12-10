export type CategoryType = "income" | "expense"
export type Frequency = "one-time" | "weekly" | "biweekly" | "monthly"
export type PlanStatus = "active" | "completed"
export type MemberRole = "owner" | "editor" | "viewer"

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  provider: string
  created_at: string
}

export interface Cashflow {
  id: string
  name: string
  description?: string
  owner_id: string
  role: MemberRole
  created_at: string
  updated_at: string
}

export interface CashflowCreate {
  name: string
  description?: string
}

export interface CashflowUpdate {
  name?: string
  description?: string
}

export interface CashflowMember {
  id: string
  user_id: string
  email: string
  name?: string
  avatar_url?: string
  role: MemberRole
  invited_at: string
}

export interface Category {
  cashflow_id?: string
  id: string
  name: string
  type: CategoryType
  icon?: string
  color?: string
}

export interface Plan {
  id: string
  category_id: string
  name: string
  expected_amount: number
  frequency: Frequency
  expected_day?: number
  start_month: string
  end_month?: string
  status: PlanStatus
  notes?: string
  created_at: string
  updated_at: string
  category: Category
}

export interface PlanCreate {
  category_id: string
  name: string
  expected_amount: number
  frequency: Frequency
  expected_day?: number
  start_month: string
  end_month?: string
  notes?: string
}

export interface PlanUpdate {
  category_id?: string
  name?: string
  expected_amount?: number
  frequency?: Frequency
  expected_day?: number
  start_month?: string
  end_month?: string
  status?: PlanStatus
  notes?: string
}

export interface Entry {
  id: string
  plan_id: string
  month_year: string
  amount: number
  date?: string
  notes?: string
  created_at: string
  plan: Plan
}

export interface EntryCreate {
  plan_id: string
  month_year: string
  amount: number
  date?: string
  notes?: string
}

export interface EntryUpdate {
  amount?: number
  date?: string
  notes?: string
}

export interface Setting {
  key: string
  value: string
}

export interface MonthItem {
  type: "entry" | "expected"
  entry?: Entry
  plan?: Plan
  month_year: string
  wouldCauseDebt?: boolean
}

export interface MonthData {
  id: string
  name: string
  items: MonthItem[]
  expectedBalance: number
  actualBalance: number
  cumulativeExpected: number
  cumulativeActual: number
}
