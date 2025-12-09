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
import type { Entry, EntryCreate, Category } from "@/types"

interface AddEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (entry: EntryCreate) => void
  editingEntry: Entry | null
  categories: Category[]
  monthIds: string[]
  currentMonthId: string
  entryType: "income" | "expense"
}

export function AddItemModal({
  open,
  onOpenChange,
  onSave,
  editingEntry,
  categories,
  monthIds,
  currentMonthId,
  entryType,
}: AddEntryModalProps) {
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [actualAmount, setActualAmount] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [actualDate, setActualDate] = useState("")
  const [monthYear, setMonthYear] = useState(currentMonthId)
  const [notes, setNotes] = useState("")

  const filteredCategories = categories.filter((c) => c.type === entryType)

  useEffect(() => {
    if (editingEntry) {
      setName(editingEntry.name)
      setCategoryId(editingEntry.category_id)
      setExpectedAmount(editingEntry.expected_amount?.toString() || "")
      setActualAmount(editingEntry.actual_amount?.toString() || "")
      setExpectedDate(editingEntry.expected_date || "")
      setActualDate(editingEntry.actual_date || "")
      setMonthYear(editingEntry.month_year)
      setNotes(editingEntry.notes || "")
    } else {
      setName("")
      setCategoryId(filteredCategories[0]?.id || "")
      setExpectedAmount("")
      setActualAmount("")
      setExpectedDate("")
      setActualDate("")
      setMonthYear(currentMonthId)
      setNotes("")
    }
  }, [editingEntry, currentMonthId, filteredCategories, entryType])

  const handleSave = () => {
    if (!name || !categoryId) return

    const entry: EntryCreate = {
      category_id: categoryId,
      name,
      month_year: monthYear,
      expected_amount: expectedAmount ? parseFloat(expectedAmount) : undefined,
      expected_date: expectedDate || undefined,
      actual_amount: actualAmount ? parseFloat(actualAmount) : undefined,
      actual_date: actualDate || undefined,
      notes: notes || undefined,
    }

    onSave(entry)
    onOpenChange(false)
  }

  const formatMonthOption = (monthId: string) => {
    const [year, month] = monthId.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? "Edit Entry" : entryType === "income" ? "Add Income" : "Add Spend"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Salary, Electricity Bill"
            />
          </div>

          {/* Month */}
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

          {/* Expected Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expectedAmount">Expected ($)</Label>
              <Input
                id="expectedAmount"
                type="number"
                min="0"
                step="0.01"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDate">Expected Date</Label>
              <Input
                id="expectedDate"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Actual Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="actualAmount">Actual ($)</Label>
              <Input
                id="actualAmount"
                type="number"
                min="0"
                step="0.01"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualDate">Actual Date</Label>
              <Input
                id="actualDate"
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !categoryId || (!expectedAmount && !actualAmount)}>
            {editingEntry ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
