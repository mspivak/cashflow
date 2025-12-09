import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ItemCard } from "./item-card"
import type { MonthData, Entry } from "@/types"

interface MonthColumnProps {
  month: MonthData
  isCurrentMonth?: boolean
  onEditEntry: (entry: Entry) => void
  onDeleteEntry: (entry: Entry) => void
  onConfirmEntry: (entry: Entry) => void
}

export function MonthColumn({ month, isCurrentMonth, onEditEntry, onDeleteEntry, onConfirmEntry }: MonthColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: month.id,
  })

  const hasActual = month.actualBalance !== 0

  const bgClass = isCurrentMonth
    ? "bg-blue-50 dark:bg-blue-950/30"
    : "bg-muted/30"

  return (
    <div
      ref={setNodeRef}
      className={`min-w-32 flex-1 flex flex-col ${bgClass} ${isOver ? "ring-1 ring-primary bg-muted/50" : ""}`}
    >
      {/* Header */}
      <div className="px-1 py-1 border-b border-border/50">
        <div className="text-[10px] font-semibold text-center text-muted-foreground uppercase tracking-wide">
          {month.name}
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1">
        <SortableContext
          items={month.entries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-32">
            {month.entries.map((entry) => (
              <ItemCard
                key={entry.id}
                entry={entry}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
                onConfirm={onConfirmEntry}
              />
            ))}
            {month.entries.length === 0 && (
              <div className="text-center text-muted-foreground/50 py-6 text-[10px]">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      {/* Footer */}
      <div className="px-1 py-1 border-t border-border/50 bg-muted/20 space-y-0.5">
        {/* Monthly balance */}
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
        {/* Cumulative balance */}
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
