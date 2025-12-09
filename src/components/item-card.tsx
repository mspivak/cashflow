import { Edit2, X, Check, Settings2 } from "lucide-react"
import type { MonthItem, Plan } from "@/types"

interface ItemCardProps {
  item: MonthItem
  onEdit: (item: MonthItem) => void
  onDelete: (item: MonthItem) => void
  onRecord: (item: MonthItem) => void
  onEditPlan: (plan: Plan) => void
}

export function ItemCard({ item, onEdit, onDelete, onRecord, onEditPlan }: ItemCardProps) {
  const isEntry = item.type === "entry"
  const plan = isEntry ? item.entry!.plan : item.plan!
  const category = plan.category
  const isIncome = category.type === "income"

  const amount = isEntry ? item.entry!.amount : plan.expected_amount

  const colorStyles = isEntry
    ? {
        backgroundColor: isIncome ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
        borderColor: isIncome ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
        color: isIncome ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)",
      }
    : {
        backgroundColor: isIncome ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
        borderColor: isIncome ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
        color: isIncome ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)",
      }

  return (
    <div
      style={colorStyles}
      className="group px-1.5 py-1 mt-px border-l-2 transition-all"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {category.icon && (
              <span className="text-[10px]">{category.icon}</span>
            )}
            <span className="text-[11px] font-medium truncate leading-tight">
              {plan.name}
            </span>
            {!isEntry && (
              <span className="text-[8px] opacity-60">(exp)</span>
            )}
          </div>
          <div className="text-[11px] font-semibold">
            {isIncome ? "+" : "-"}${Math.abs(amount).toLocaleString()}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {!isEntry && (
            <button
              type="button"
              onClick={() => onRecord(item)}
              className="p-0.5 opacity-40 hover:opacity-100 hover:text-green-600 transition-opacity"
              title="Record"
            >
              <Check size={10} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEditPlan(plan)}
            className="p-0.5 opacity-40 hover:opacity-100 hover:text-blue-600 transition-opacity"
            title="Edit Plan"
          >
            <Settings2 size={10} />
          </button>
          {isEntry && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-0.5 opacity-40 hover:opacity-100 transition-opacity"
              title="Edit Entry"
            >
              <Edit2 size={10} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-0.5 opacity-40 hover:opacity-100 hover:text-red-600 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}
