import { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import { ItemCard } from "./item-card"
import type { MonthData, MonthItem } from "@/types"

interface MonthColumnProps {
  month: MonthData
  isCurrentMonth?: boolean
  isFirstMonth?: boolean
  startingBalance?: number
  maxAmount: number
  onItemClick: (item: MonthItem) => void
}

const MIN_ITEM_HEIGHT = 28
const ITEM_GAP = 1

export function MonthColumn({ month, isCurrentMonth, isFirstMonth, startingBalance, maxAmount, onItemClick }: MonthColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: month.id,
  })

  const hasActual = month.actualBalance !== 0

  const bgClass = isCurrentMonth
    ? "bg-blue-50 dark:bg-blue-950/30"
    : isOver
      ? "bg-blue-100 dark:bg-blue-900/30"
      : "bg-muted/30"

  const { incomeItems, expenseItems } = useMemo(() => {
    const income: MonthItem[] = []
    const expense: MonthItem[] = []
    for (const item of month.items) {
      const category = item.type === "entry" ? item.entry!.plan.category : item.plan!.category
      if (category.type === "income") {
        income.push(item)
      } else {
        expense.push(item)
      }
    }
    return { incomeItems: income, expenseItems: expense }
  }, [month.items])

  const getItemHeight = (item: MonthItem, availableHeight: number) => {
    const amount = item.type === "entry" ? item.entry!.amount : item.plan!.expected_amount
    if (maxAmount === 0) return MIN_ITEM_HEIGHT
    const proportional = (amount / maxAmount) * availableHeight * 0.8
    return Math.max(MIN_ITEM_HEIGHT, proportional)
  }

  return (
    <div ref={setNodeRef} className={`min-w-32 flex-1 flex flex-col h-full transition-colors ${bgClass}`}>
      <div className="flex-1 flex flex-col-reverse overflow-hidden">
        {incomeItems.map((item, index) => (
          <div key={item.type === "entry" ? item.entry!.id : `expected-${item.plan!.id}-${index}`} style={{ marginBottom: ITEM_GAP }}>
            <ItemCard
              item={item}
              onClick={onItemClick}
              itemIndex={index}
              height={getItemHeight(item, 200)}
            />
          </div>
        ))}
      </div>

      <div className="px-1 py-1.5 border-y border-border/50 bg-muted/30 space-y-0.5 shrink-0">
        <div className="text-[10px] font-semibold text-center text-muted-foreground uppercase tracking-wide mb-1">
          {month.name}
        </div>
        {isFirstMonth && startingBalance !== undefined && (
          <div className="flex justify-between text-[10px] border-b border-border/30 pb-0.5 mb-0.5">
            <span className="text-muted-foreground">Starting</span>
            <span className={`font-medium ${startingBalance >= 0 ? "text-blue-600" : "text-red-600"}`}>
              ${startingBalance.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Expected</span>
          <span
            className={`font-medium ${month.expectedBalance >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {month.expectedBalance >= 0 ? "+" : ""}
            {month.expectedBalance.toLocaleString()}
          </span>
        </div>
        {hasActual && (
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Actual</span>
            <span
              className={`font-medium ${month.actualBalance >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {month.actualBalance >= 0 ? "+" : ""}
              {month.actualBalance.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between text-[11px] font-semibold border-t border-border/30 pt-0.5">
          <span className="text-muted-foreground">Total</span>
          <span
            className={
              month.cumulativeExpected >= 0 ? "text-green-600" : "text-red-600"
            }
          >
            ${month.cumulativeExpected.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {expenseItems.map((item, index) => (
          <div key={item.type === "entry" ? item.entry!.id : `expected-${item.plan!.id}-${index}`} style={{ marginTop: ITEM_GAP }}>
            <ItemCard
              item={item}
              onClick={onItemClick}
              itemIndex={incomeItems.length + index}
              height={getItemHeight(item, 200)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
