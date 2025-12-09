import { format, addMonths, parse } from "date-fns"
import type { Entry, MonthData, Recurring } from "@/types"

export function generateMonthId(date: Date): string {
  return format(date, "yyyy-MM")
}

export function formatMonthName(monthId: string): string {
  const date = parse(monthId, "yyyy-MM", new Date())
  return format(date, "MMM yyyy")
}

export function generateMonthRange(startMonth: string, count: number): string[] {
  const start = parse(startMonth, "yyyy-MM", new Date())
  const months: string[] = []
  for (let i = 0; i < count; i++) {
    months.push(generateMonthId(addMonths(start, i)))
  }
  return months
}

// Check if a recurring item is active in a given month
function isRecurringActiveInMonth(recurring: Recurring, monthId: string): boolean {
  if (monthId < recurring.start_month) return false
  if (recurring.end_month && monthId > recurring.end_month) return false
  return true
}

// Expand recurring templates into expected entries for display
export function expandRecurringToEntries(
  recurring: Recurring[],
  entries: Entry[],
  monthIds: string[]
): Entry[] {
  const expanded: Entry[] = [...entries]
  const existingKeys = new Set(
    entries
      .filter((e) => e.recurring_id)
      .map((e) => `${e.recurring_id}-${e.month_year}`)
  )

  for (const rec of recurring) {
    for (const monthId of monthIds) {
      if (!isRecurringActiveInMonth(rec, monthId)) continue

      const key = `${rec.id}-${monthId}`
      if (existingKeys.has(key)) continue // Already have an entry for this

      // Create a placeholder entry for this recurring item
      const placeholderEntry: Entry = {
        id: `recurring-${key}`,
        category_id: rec.category_id,
        recurring_id: rec.id,
        name: rec.name,
        month_year: monthId,
        expected_amount: rec.expected_amount,
        expected_date: undefined,
        actual_amount: undefined,
        actual_date: undefined,
        has_milestones: false,
        notes: undefined,
        created_at: rec.created_at,
        updated_at: rec.created_at,
        category: rec.category,
        milestones: [],
      }

      // For biweekly, add two entries
      if (rec.frequency === "biweekly") {
        expanded.push({
          ...placeholderEntry,
          id: `recurring-${key}-1`,
          name: `${rec.name} (1st)`,
        })
        expanded.push({
          ...placeholderEntry,
          id: `recurring-${key}-2`,
          name: `${rec.name} (2nd)`,
        })
      } else {
        expanded.push(placeholderEntry)
      }
    }
  }

  return expanded
}

// Calculate balances for each month
export function calculateBalances(
  monthIds: string[],
  entries: Entry[],
  recurring: Recurring[],
  startingBalance: number
): MonthData[] {
  // Expand recurring items
  const allEntries = expandRecurringToEntries(recurring, entries, monthIds)

  let cumulativeExpected = startingBalance
  let cumulativeActual = startingBalance

  return monthIds.map((monthId) => {
    const monthEntries = allEntries.filter((e) => e.month_year === monthId)

    // Calculate expected balance (income - expenses)
    const expectedBalance = monthEntries.reduce((sum, entry) => {
      const amount = entry.expected_amount ?? 0
      return sum + (entry.category.type === "income" ? amount : -amount)
    }, 0)

    // Calculate actual balance (only confirmed entries)
    const actualBalance = monthEntries.reduce((sum, entry) => {
      if (entry.actual_amount === undefined || entry.actual_amount === null) {
        return sum
      }
      return sum + (entry.category.type === "income" ? entry.actual_amount : -entry.actual_amount)
    }, 0)

    cumulativeExpected += expectedBalance
    cumulativeActual += actualBalance

    return {
      id: monthId,
      name: formatMonthName(monthId),
      entries: monthEntries,
      expectedBalance,
      actualBalance,
      cumulativeExpected,
      cumulativeActual,
    }
  })
}

export function findEarliestAffordableMonth(
  amount: number,
  months: MonthData[]
): string | null {
  for (const month of months) {
    if (month.cumulativeExpected >= amount) {
      return month.id
    }
  }
  return null
}
