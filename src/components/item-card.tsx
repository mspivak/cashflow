import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { MonthItem } from "@/types"

interface ItemCardProps {
  item: MonthItem
  onClick: (item: MonthItem) => void
  itemIndex: number
}

export function ItemCard({ item, onClick, itemIndex }: ItemCardProps) {
  const isEntry = item.type === "entry"
  const plan = isEntry ? item.entry!.plan : item.plan!
  const category = plan.category
  const isIncome = category.type === "income"
  const isDraggable = !isEntry && plan.frequency === "one-time"

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.month_year}-${plan.id}-${itemIndex}`,
    data: { item, plan },
    disabled: !isDraggable,
  })

  const amount = isEntry ? item.entry!.amount : plan.expected_amount

  const wouldCauseDebt = item.wouldCauseDebt

  const colorStyles = isEntry
    ? {
        backgroundColor: isIncome ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
        borderColor: isIncome ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
        color: isIncome ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)",
      }
    : wouldCauseDebt
      ? {
          backgroundColor: "rgba(251, 146, 60, 0.3)",
          borderColor: "rgb(234, 88, 12)",
          color: "rgb(154, 52, 18)",
        }
      : {
          backgroundColor: isIncome ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          borderColor: isIncome ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
          color: isIncome ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)",
        }

  const style = {
    ...colorStyles,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const handleClick = () => {
    if (!isDragging) {
      onClick(item)
    }
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={handleClick}
      style={style}
      className={`w-full text-left px-1.5 py-1 mt-px border-l-2 transition-all hover:opacity-80 ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isDragging ? "z-50" : ""}`}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
    >
      <div className="flex items-center gap-1">
        {wouldCauseDebt && (
          <span className="text-[10px]" title="Would cause negative balance">⚠️</span>
        )}
        {category.icon && !wouldCauseDebt && (
          <span className="text-[10px]">{category.icon}</span>
        )}
        <span className="text-[11px] font-medium truncate leading-tight">
          {plan.name}
        </span>
        {!isEntry && !wouldCauseDebt && (
          <span className="text-[8px] opacity-60">(exp)</span>
        )}
      </div>
      <div className="text-[11px] font-semibold">
        {isIncome ? "+" : "-"}${Math.abs(amount).toLocaleString()}
      </div>
    </button>
  )
}
