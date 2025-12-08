import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ItemCard } from "./item-card"
import type { MonthData, Item } from "@/types"

interface MonthColumnProps {
  month: MonthData
  onEditItem: (item: Item) => void
  onDeleteItem: (id: string) => void
}

export function MonthColumn({ month, onEditItem, onDeleteItem }: MonthColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: month.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-w-32 flex-1 flex flex-col bg-muted/30 rounded-md ${isOver ? "ring-1 ring-primary bg-muted/50" : ""}`}
    >
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border/50">
        <div className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wide">
          {month.name}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-1.5">
        <SortableContext
          items={month.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-32 space-y-1">
            {month.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            ))}
            {month.items.length === 0 && (
              <div className="text-center text-muted-foreground/50 py-6 text-[10px]">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 border-t border-border/50 bg-muted/20 space-y-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Month</span>
          <span
            className={`font-medium ${month.monthlyBalance >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {month.monthlyBalance >= 0 ? "+" : ""}
            {month.monthlyBalance.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-muted-foreground">Total</span>
          <span
            className={
              month.cumulativeBalance >= 0 ? "text-green-600" : "text-red-600"
            }
          >
            ${month.cumulativeBalance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
