export type ItemType = "income" | "expense" | "optional"
export type Frequency = "once" | "monthly" | "biweekly"

export interface Item {
  id: string
  name: string
  amount: number
  type: ItemType
  frequency: Frequency
  month_year: string
  created_at: string
  updated_at: string
}

export interface ItemCreate {
  name: string
  amount: number
  type: ItemType
  frequency: Frequency
  month_year: string
}

export interface Setting {
  key: string
  value: string
}

export interface MonthData {
  id: string // "2025-01"
  name: string // "Jan 2025"
  items: Item[]
  monthlyBalance: number
  cumulativeBalance: number
}
