import { ItemCard } from "./item-card"
import type { MonthData, MonthItem } from "@/types"

interface MonthColumnProps {
  month: MonthData
  isCurrentMonth?: boolean
  onEditItem: (item: MonthItem) => void
  onDeleteItem: (item: MonthItem) => void
  onRecordEntry: (item: MonthItem) => void
}

export function MonthColumn({ month, isCurrentMonth, onEditItem, onDeleteItem, onRecordEntry }: MonthColumnProps) {
  const hasActual = month.actualBalance !== 0

  const bgClass = isCurrentMonth
    ? "bg-blue-50 dark:bg-blue-950/30"
    : "bg-muted/30"

  return (
    <div className={`min-w-32 flex-1 flex flex-col ${bgClass}`}>
      <div className="px-1 py-1 border-b border-border/50">
        <div className="text-[10px] font-semibold text-center text-muted-foreground uppercase tracking-wide">
          {month.name}
        </div>
      </div>

      <div className="flex-1">
        <div className="min-h-32">
          {month.items.map((item, index) => (
            <ItemCard
              key={item.type === "entry" ? item.entry!.id : `expected-${item.plan!.id}-${index}`}
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onRecord={onRecordEntry}
            />
          ))}
          {month.items.length === 0 && (
            <div className="text-center text-muted-foreground/50 py-6 text-[10px]">
              No items
            </div>
          )}
        </div>
      </div>

      <div className="px-1 py-1 border-t border-border/50 bg-muted/20 space-y-0.5">
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
    </div>
  )
}
