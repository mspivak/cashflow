import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Edit2, Trash2 } from "lucide-react"
import type { Item } from "@/types"

interface ItemCardProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (id: string) => void
  isDragging?: boolean
}

export function ItemCard({ item, onEdit, onDelete, isDragging }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const colors = {
    income: "bg-green-500/10 border-green-500 text-green-700",
    expense: "bg-red-500/10 border-red-500 text-red-700",
    optional: "bg-purple-500/10 border-purple-500 text-purple-700",
  }

  // Check if this is a recurring item (has dash after base id)
  const isRecurringInstance = item.id.includes("-20")

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group px-2 py-1 rounded border-l-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm ${colors[item.type]} ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium truncate leading-tight">
            {item.name}
          </div>
          <div className="text-[11px] font-semibold">
            {item.type === "income" ? "+" : "-"}${Math.abs(item.amount).toLocaleString()}
          </div>
        </div>
        {!isRecurringInstance && (
          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
              }}
              className="p-0.5 hover:bg-black/10 rounded"
            >
              <Edit2 size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
              className="p-0.5 hover:bg-black/10 rounded"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
