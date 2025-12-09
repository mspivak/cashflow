import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Edit2, X, Check } from "lucide-react"
import type { Entry } from "@/types"
import { getEntryStatus } from "@/types"

interface ItemCardProps {
  entry: Entry
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
  onConfirm?: (entry: Entry) => void
  isDragging?: boolean
}

export function ItemCard({ entry, onEdit, onDelete, onConfirm, isDragging }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: entry.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const status = getEntryStatus(entry)
  const isIncome = entry.category.type === "income"

  // Use inline styles for dynamic colors
  const colorStyles = {
    pending: {
      backgroundColor: isIncome ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
      borderColor: isIncome ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
      color: isIncome ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)",
    },
    confirmed: {
      backgroundColor: isIncome ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
      borderColor: isIncome ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
      color: isIncome ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)",
    },
    unplanned: {
      backgroundColor: "rgba(249, 115, 22, 0.1)",
      borderColor: "rgb(249, 115, 22)",
      color: "rgb(194, 65, 12)",
    },
  }

  const displayAmount = entry.actual_amount ?? entry.expected_amount ?? 0
  const hasExpectedAndActual = entry.expected_amount != null && entry.actual_amount != null
  const difference = hasExpectedAndActual ? (entry.actual_amount! - entry.expected_amount!) : 0

  // Check if this is a placeholder from recurring expansion
  const isPlaceholder = entry.id.startsWith("recurring-")

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...colorStyles[status] }}
      className={`group px-1.5 py-1 mt-px border-l-2 transition-all ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        {/* Draggable content area */}
        <div
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center gap-1">
            {entry.category.icon && (
              <span className="text-[10px]">{entry.category.icon}</span>
            )}
            <span className="text-[11px] font-medium truncate leading-tight">
              {entry.name}
            </span>
            {status === "pending" && (
              <span className="text-[8px] opacity-60">(exp)</span>
            )}
          </div>
          <div className="text-[11px] font-semibold flex items-center gap-1">
            <span>
              {isIncome ? "+" : "-"}${Math.abs(displayAmount).toLocaleString()}
            </span>
            {hasExpectedAndActual && difference !== 0 && (
              <span className={`text-[9px] ${difference > 0 ? "text-red-500" : "text-green-500"}`}>
                ({difference > 0 ? "+" : ""}{difference.toLocaleString()})
              </span>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex shrink-0 gap-0.5">
          {status === "pending" && !isPlaceholder && onConfirm && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onConfirm(entry)}
              className="p-0.5 opacity-40 hover:opacity-100 hover:text-green-600 transition-opacity"
              title="Confirm"
            >
              <Check size={10} />
            </button>
          )}
          {!isPlaceholder && (
            <>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onEdit(entry)}
                className="p-0.5 opacity-40 hover:opacity-100 transition-opacity"
              >
                <Edit2 size={10} />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onDelete(entry)}
                className="p-0.5 opacity-40 hover:opacity-100 hover:text-red-600 transition-opacity"
              >
                <X size={10} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
