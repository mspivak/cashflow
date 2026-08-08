import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { TriangleAlert } from "lucide-react"
import type { MonthItem } from "@/types"

interface ItemCardProps {
  item: MonthItem
  onClick: (item: MonthItem) => void
  itemIndex: number
  height?: number
  interactive?: boolean
}

export function ItemCard({ item, onClick, itemIndex, height, interactive = true }: ItemCardProps) {
  const isEntry = item.type === "entry"
  const plan = isEntry ? item.entry!.plan : item.plan!
  const category = plan.category
  const isIncome = category.type === "income"
  const isDraggable = interactive && !isEntry && plan.frequency === "one-time"

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.month_year}-${plan.id}-${itemIndex}`,
    data: { item, plan },
    disabled: !isDraggable,
  })

  const amount = isEntry ? item.entry!.amount : plan.expected_amount

  const wouldCauseDebt = item.wouldCauseDebt

  const toneClass = wouldCauseDebt
    ? "border-negative bg-negative/10 text-negative border-dashed"
    : isEntry
      ? isIncome
        ? "border-income/60 bg-income/12 text-income"
        : "border-spend/50 bg-spend/10 text-spend"
      : isIncome
        ? "border-income/40 bg-income/5 text-income/90 border-dashed"
        : "border-spend/35 bg-spend/4 text-spend/90 border-dashed"

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    ...(height !== undefined && { height, minHeight: height }),
  }

  const handleClick = () => {
    if (interactive && !isDragging) {
      onClick(item)
    }
  }

  const hasProportionalHeight = height !== undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={handleClick}
      style={style}
      className={`w-full text-left px-1.5 rounded-[3px] border transition-colors overflow-hidden relative z-[2] ${toneClass} ${hasProportionalHeight ? "flex flex-col justify-center py-0" : "py-1 mt-px"} ${interactive ? "hover:brightness-95 dark:hover:brightness-110" : "cursor-default"} ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "z-50" : ""}`}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      {...(!interactive && { tabIndex: -1 })}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {wouldCauseDebt && (
            <TriangleAlert
              className="h-2.5 w-2.5 shrink-0"
              aria-label="Would cause negative balance"
            />
          )}
          <span className="text-[11px] font-medium truncate leading-tight">
            {plan.name}
          </span>
        </div>
        <div className="text-[11px] font-semibold tabular-nums shrink-0">
          {isIncome ? "+" : "−"}${Math.abs(amount).toLocaleString()}
        </div>
      </div>
    </button>
  )
}
