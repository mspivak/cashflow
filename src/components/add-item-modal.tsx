import { useState, useEffect, useMemo } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
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
import type { Category, Plan, PlanCreate, PlanUpdate, EntryCreate, MonthItem, Frequency } from "@/types"

interface AddItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { plan?: PlanCreate; entry?: EntryCreate }) => void
  onUpdatePlan: (id: string, data: PlanUpdate) => void
  onDelete: (item: MonthItem) => void
  editingItem: MonthItem | null
  categories: Category[]
  plans: Plan[]
  monthIds: string[]
  currentMonthId: string
  entryType: "income" | "expense"
  canEdit?: boolean
}

export function AddItemModal({
  open,
  onOpenChange,
  onSave,
  onUpdatePlan,
  onDelete,
  editingItem,
  categories,
  plans,
  monthIds,
  currentMonthId,
  entryType,
  canEdit = true,
}: AddItemModalProps) {
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [frequency, setFrequency] = useState<Frequency>("one-time")
  const [monthYear, setMonthYear] = useState(currentMonthId)
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [recordNow, setRecordNow] = useState(true)
  const [showPlanEdit, setShowPlanEdit] = useState(false)
  const [planName, setPlanName] = useState("")
  const [planCategoryId, setPlanCategoryId] = useState("")
  const [planExpectedAmount, setPlanExpectedAmount] = useState("")
  const [planFrequency, setPlanFrequency] = useState<Frequency>("one-time")
  const [planEndMonth, setPlanEndMonth] = useState("")

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === entryType),
    [categories, entryType]
  )
  const filteredPlans = useMemo(
    () => plans.filter((p) => p.category.type === entryType && p.status === "active"),
    [plans, entryType]
  )

  const isEditingEntry = editingItem?.type === "entry"
  const isRecordingExpected = editingItem?.type === "expected"

  const currentPlan = useMemo(() => {
    if (isEditingEntry && editingItem?.entry) {
      return editingItem.entry.plan
    }
    if (isRecordingExpected && editingItem?.plan) {
      return editingItem.plan
    }
    return null
  }, [editingItem, isEditingEntry, isRecordingExpected])

  useEffect(() => {
    if (!open) return

    setShowPlanEdit(false)

    if (editingItem) {
      if (isEditingEntry && editingItem.entry) {
        setMode("existing")
        setSelectedPlanId(editingItem.entry.plan_id)
        setAmount(editingItem.entry.amount.toString())
        setDate(editingItem.entry.date || "")
        setNotes(editingItem.entry.notes || "")
        setMonthYear(editingItem.entry.month_year)
        setPlanName(editingItem.entry.plan.name)
        setPlanCategoryId(editingItem.entry.plan.category_id)
        setPlanExpectedAmount(editingItem.entry.plan.expected_amount.toString())
        setPlanFrequency(editingItem.entry.plan.frequency as Frequency)
        setPlanEndMonth(editingItem.entry.plan.end_month || "")
      } else if (isRecordingExpected && editingItem.plan) {
        setMode("existing")
        setSelectedPlanId(editingItem.plan.id)
        setAmount(editingItem.plan.expected_amount.toString())
        setDate("")
        setNotes("")
        setMonthYear(editingItem.month_year)
        setRecordNow(true)
        setPlanName(editingItem.plan.name)
        setPlanCategoryId(editingItem.plan.category_id)
        setPlanExpectedAmount(editingItem.plan.expected_amount.toString())
        setPlanFrequency(editingItem.plan.frequency as Frequency)
        setPlanEndMonth(editingItem.plan.end_month || "")
      }
    } else {
      setMode("new")
      setSelectedPlanId("")
      setName("")
      const firstCat = categories.find((c) => c.type === entryType)
      setCategoryId(firstCat?.id || "")
      setExpectedAmount("")
      setFrequency("one-time")
      setMonthYear(currentMonthId)
      setAmount("")
      setDate(new Date().toISOString().split("T")[0])
      setNotes("")
      setRecordNow(true)
      setPlanName("")
      setPlanCategoryId("")
      setPlanExpectedAmount("")
      setPlanFrequency("one-time")
      setPlanEndMonth("")
    }
  }, [open, editingItem, currentMonthId, categories, entryType, isEditingEntry, isRecordingExpected, currentPlan])

  const handleSavePlanOnly = () => {
    if (currentPlan) {
      onUpdatePlan(currentPlan.id, {
        name: planName,
        category_id: planCategoryId,
        expected_amount: parseFloat(planExpectedAmount),
        frequency: planFrequency,
        end_month: planEndMonth || undefined,
      })
    }
    onOpenChange(false)
  }

  const handleSave = () => {
    if (showPlanEdit && currentPlan) {
      onUpdatePlan(currentPlan.id, {
        name: planName,
        category_id: planCategoryId,
        expected_amount: parseFloat(planExpectedAmount),
        frequency: planFrequency,
        end_month: planEndMonth || undefined,
      })
    }

    if (isEditingEntry) {
      onSave({
        entry: {
          plan_id: selectedPlanId,
          month_year: monthYear,
          amount: parseFloat(amount),
          date: date || undefined,
          notes: notes || undefined,
        },
      })
    } else if (isRecordingExpected) {
      onSave({
        entry: {
          plan_id: selectedPlanId,
          month_year: monthYear,
          amount: parseFloat(amount),
          date: date || undefined,
          notes: notes || undefined,
        },
      })
    } else if (mode === "existing" && selectedPlanId) {
      onSave({
        entry: {
          plan_id: selectedPlanId,
          month_year: monthYear,
          amount: parseFloat(amount),
          date: date || undefined,
          notes: notes || undefined,
        },
      })
    } else if (mode === "new") {
      const planData: PlanCreate = {
        category_id: categoryId,
        name,
        expected_amount: parseFloat(expectedAmount),
        frequency,
        start_month: monthYear,
      }

      if (recordNow && amount) {
        onSave({
          plan: planData,
          entry: {
            plan_id: "",
            month_year: monthYear,
            amount: parseFloat(amount),
            date: date || undefined,
            notes: notes || undefined,
          },
        })
      } else {
        onSave({ plan: planData })
      }
    }
    onOpenChange(false)
  }

  const formatMonthOption = (monthId: string) => {
    const [year, month] = monthId.split("-")
    const d = new Date(parseInt(year), parseInt(month) - 1)
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  const canSavePlan = planName && planCategoryId && planExpectedAmount && parseFloat(planExpectedAmount) > 0

  const canSave = isEditingEntry || isRecordingExpected
    ? amount && parseFloat(amount) > 0 && (!showPlanEdit || canSavePlan)
    : mode === "existing"
      ? selectedPlanId && amount && parseFloat(amount) > 0
      : name && categoryId && expectedAmount && parseFloat(expectedAmount) > 0 && (!recordNow || (amount && parseFloat(amount) > 0))

  const title = isEditingEntry
    ? "Edit Entry"
    : isRecordingExpected
      ? "Record Entry"
      : entryType === "income"
        ? "Add Income"
        : "Add Spend"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!editingItem && (
                <div className="flex gap-2">
                  <Button
                    variant={mode === "new" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("new")}
                    className="flex-1"
                  >
                    New Plan
                  </Button>
                  <Button
                    variant={mode === "existing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("existing")}
                    className="flex-1"
                    disabled={filteredPlans.length === 0}
                  >
                    Existing Plan
                  </Button>
                </div>
              )}

              {(mode === "existing" || editingItem) && !isEditingEntry && !isRecordingExpected && (
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPlans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.category.icon} {p.name} (${p.expected_amount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(isEditingEntry || isRecordingExpected) && currentPlan && (
                <div className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPlanEdit(!showPlanEdit)}
                    className="w-full p-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        {currentPlan.category.icon} {currentPlan.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expected: ${currentPlan.expected_amount} · {currentPlan.frequency}
                      </div>
                    </div>
                    {showPlanEdit ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {showPlanEdit && (
                    <div className="p-3 space-y-3 border-t">
                      <div className="space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Category</Label>
                        <Select value={planCategoryId} onValueChange={setPlanCategoryId}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
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
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Expected ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={planExpectedAmount}
                            onChange={(e) => setPlanExpectedAmount(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Frequency</Label>
                          <Select value={planFrequency} onValueChange={(v) => setPlanFrequency(v as Frequency)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="one-time">One-time</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {planFrequency !== "one-time" && (
                        <div className="space-y-2">
                          <Label className="text-xs">End Month (optional)</Label>
                          <Select
                            value={planEndMonth || "none"}
                            onValueChange={(v) => setPlanEndMonth(v === "none" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="No end date" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No end date</SelectItem>
                              {monthIds.map((monthId) => (
                                <SelectItem key={monthId} value={monthId}>
                                  {formatMonthOption(monthId)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === "new" && !editingItem && (
                <>
                  <div className="space-y-2">
                    <Label>Category</Label>
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

                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Monthly Salary, Rent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Expected Amount ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={expectedAmount}
                        onChange={(e) => {
                          setExpectedAmount(e.target.value)
                          if (recordNow) setAmount(e.target.value)
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-time">One-time</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Month</Label>
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

              {mode === "new" && !editingItem && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recordNow"
                    checked={recordNow}
                    onChange={(e) => setRecordNow(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="recordNow" className="text-sm font-normal cursor-pointer">
                    Record entry now
                  </Label>
                </div>
              )}

              {(recordNow || mode === "existing" || editingItem) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional details..."
                    />
                  </div>
                </>
              )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {editingItem ? (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(editingItem)
                onOpenChange(false)
              }}
            >
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isRecordingExpected ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSavePlanOnly}
                  disabled={!canSavePlan}
                >
                  Save Plan
                </Button>
                <Button onClick={handleSave} disabled={!canSave}>
                  Record Payment
                </Button>
              </>
            ) : (
              <Button onClick={handleSave} disabled={!canSave}>
                {isEditingEntry ? "Update" : "Save"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
