import { format, addMonths, parse } from "date-fns"
import type { Entry, Plan, MonthData, MonthItem } from "@/types"

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

function isPlanActiveInMonth(plan: Plan, monthId: string): boolean {
  if (plan.status === "completed") return false
  if (monthId < plan.start_month) return false
  if (plan.end_month && monthId > plan.end_month) return false
  if (plan.frequency === "one-time" && monthId !== plan.start_month) return false
  return true
}

export function buildMonthItems(
  plans: Plan[],
  entries: Entry[],
  monthIds: string[]
): Map<string, MonthItem[]> {
  const monthItemsMap = new Map<string, MonthItem[]>()

  for (const monthId of monthIds) {
    monthItemsMap.set(monthId, [])
  }

  const entriesByPlanAndMonth = new Map<string, Entry[]>()
  for (const entry of entries) {
    const key = `${entry.plan_id}-${entry.month_year}`
    const existing = entriesByPlanAndMonth.get(key) || []
    existing.push(entry)
    entriesByPlanAndMonth.set(key, existing)
  }

  for (const monthId of monthIds) {
    const items: MonthItem[] = []

    for (const plan of plans) {
      const key = `${plan.id}-${monthId}`
      const planEntries = entriesByPlanAndMonth.get(key) || []
      const expectedCount = plan.frequency === "biweekly" ? 2 : plan.frequency === "weekly" ? 4 : 1

      for (const entry of planEntries) {
        items.push({
          type: "entry",
          entry,
          plan: entry.plan,
          month_year: monthId,
        })
      }

      if (isPlanActiveInMonth(plan, monthId)) {
        const remainingExpected = expectedCount - planEntries.length
        for (let i = 0; i < remainingExpected; i++) {
          items.push({
            type: "expected",
            plan,
            month_year: monthId,
          })
        }
      }
    }

    const monthEntries = entries.filter((e) => e.month_year === monthId)
    for (const entry of monthEntries) {
      const alreadyAdded = items.some(
        (item) => item.type === "entry" && item.entry?.id === entry.id
      )
      if (!alreadyAdded) {
        items.push({
          type: "entry",
          entry,
          plan: entry.plan,
          month_year: monthId,
        })
      }
    }

    items.sort((a, b) => {
      const catA = a.type === "entry" ? a.entry!.plan.category : a.plan!.category
      const catB = b.type === "entry" ? b.entry!.plan.category : b.plan!.category
      if (catA.type === "income" && catB.type === "expense") return -1
      if (catA.type === "expense" && catB.type === "income") return 1
      return 0
    })

    monthItemsMap.set(monthId, items)
  }

  return monthItemsMap
}

export function calculateBalances(
  monthIds: string[],
  plans: Plan[],
  entries: Entry[],
  startingBalance: number
): MonthData[] {
  const monthItemsMap = buildMonthItems(plans, entries, monthIds)

  let cumulativeExpected = startingBalance
  let cumulativeActual = startingBalance

  return monthIds.map((monthId) => {
    const items = monthItemsMap.get(monthId) || []

    const expectedBalance = items.reduce((sum, item) => {
      const amount = item.type === "entry"
        ? item.entry!.amount
        : item.plan!.expected_amount
      const category = item.type === "entry"
        ? item.entry!.plan.category
        : item.plan!.category
      return sum + (category.type === "income" ? amount : -amount)
    }, 0)

    const actualBalance = items.reduce((sum, item) => {
      if (item.type !== "entry") return sum
      const amount = item.entry!.amount
      const category = item.entry!.plan.category
      return sum + (category.type === "income" ? amount : -amount)
    }, 0)

    let runningBalance = cumulativeExpected
    for (const item of items) {
      const amount = item.type === "entry"
        ? item.entry!.amount
        : item.plan!.expected_amount
      const category = item.type === "entry"
        ? item.entry!.plan.category
        : item.plan!.category
      const delta = category.type === "income" ? amount : -amount
      runningBalance += delta
      if (item.type === "expected" && category.type === "expense" && runningBalance < 0) {
        item.wouldCauseDebt = true
      }
    }

    cumulativeExpected += expectedBalance
    cumulativeActual += actualBalance

    return {
      id: monthId,
      name: formatMonthName(monthId),
      items,
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
