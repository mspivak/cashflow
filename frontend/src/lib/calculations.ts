import { format, addMonths, parse } from "date-fns"
import type { Item, MonthData } from "@/types"

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

export function expandRecurringItems(items: Item[], monthIds: string[]): Item[] {
  const expanded: Item[] = []

  for (const item of items) {
    if (item.frequency === "once") {
      // One-time items: only include if month is visible
      if (monthIds.includes(item.month_year)) {
        expanded.push(item)
      }
    } else if (item.frequency === "monthly") {
      // Monthly items: expand to each visible month
      for (const monthId of monthIds) {
        expanded.push({
          ...item,
          id: `${item.id}-${monthId}`,
          month_year: monthId,
        })
      }
    } else if (item.frequency === "biweekly") {
      // Bi-weekly items: 2 per month
      for (const monthId of monthIds) {
        expanded.push({
          ...item,
          id: `${item.id}-${monthId}-1`,
          name: `${item.name} (1st)`,
          month_year: monthId,
        })
        expanded.push({
          ...item,
          id: `${item.id}-${monthId}-2`,
          name: `${item.name} (2nd)`,
          month_year: monthId,
        })
      }
    }
  }

  return expanded
}

export function calculateBalances(
  monthIds: string[],
  items: Item[],
  startingBalance: number
): MonthData[] {
  const expandedItems = expandRecurringItems(items, monthIds)
  let cumulative = startingBalance

  return monthIds.map((monthId) => {
    const monthItems = expandedItems.filter((item) => item.month_year === monthId)
    const monthlyBalance = monthItems.reduce((sum, item) => {
      return sum + (item.type === "income" ? item.amount : -item.amount)
    }, 0)
    cumulative += monthlyBalance

    return {
      id: monthId,
      name: formatMonthName(monthId),
      items: monthItems,
      monthlyBalance,
      cumulativeBalance: cumulative,
    }
  })
}

export function findEarliestAffordableMonth(
  amount: number,
  months: MonthData[]
): string | null {
  for (const month of months) {
    if (month.cumulativeBalance >= amount) {
      return month.id
    }
  }
  return null
}
