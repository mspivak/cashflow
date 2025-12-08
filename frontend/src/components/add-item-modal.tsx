import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Item, ItemCreate, ItemType, Frequency } from "@/types"

interface AddItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (item: ItemCreate) => void
  editingItem: Item | null
  monthIds: string[]
  currentMonthId: string
}

export function AddItemModal({
  open,
  onOpenChange,
  onSave,
  editingItem,
  monthIds,
  currentMonthId,
}: AddItemModalProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<ItemType>("expense")
  const [frequency, setFrequency] = useState<Frequency>("once")
  const [monthYear, setMonthYear] = useState(currentMonthId)

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name)
      setAmount(editingItem.amount.toString())
      setType(editingItem.type)
      setFrequency(editingItem.frequency)
      setMonthYear(editingItem.month_year)
    } else {
      setName("")
      setAmount("")
      setType("expense")
      setFrequency("once")
      setMonthYear(currentMonthId)
    }
  }, [editingItem, currentMonthId])

  const handleSave = () => {
    if (!name || !amount) return

    onSave({
      name,
      amount: parseFloat(amount),
      type,
      frequency,
      month_year: monthYear,
    })
    onOpenChange(false)
  }

  const formatMonthOption = (monthId: string) => {
    const [year, month] = monthId.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Salary, Netflix, New Car"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Fixed Expense</SelectItem>
                <SelectItem value="optional">Optional Purchase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as Frequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">One-time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "once" && (
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={monthYear} onValueChange={setMonthYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthIds.map((monthId) => (
                    <SelectItem key={monthId} value={monthId}>
                      {formatMonthOption(monthId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "optional" && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-700">
                <strong>Optional items</strong> can be moved to find the best month
                for your budget.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !amount}>
            {editingItem ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
