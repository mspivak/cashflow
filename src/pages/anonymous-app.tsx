import { useState, useMemo, useCallback, useSyncExternalStore } from "react"
import { addMonths, subMonths } from "date-fns"
import {
  DndContext,
  DragEndEvent,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { MonthColumn } from "@/components/month-column"
import { AddItemModal } from "@/components/add-item-modal"
import { SettingsModal } from "@/components/settings-modal"
import {
  getOrCreateLocalCashflow,
  addLocalPlan,
  addLocalEntry,
  updateLocalPlan,
  updateLocalEntry,
  deleteLocalPlan,
  deleteLocalEntry,
  updateLocalSetting,
  setPendingImport,
} from "@/lib/local-storage"
import { loginWithGoogle } from "@/lib/api"
import {
  generateMonthId,
  generateMonthRange,
} from "@/lib/calculations"
import type {
  Plan,
  PlanCreate,
  PlanUpdate,
  EntryCreate,
  MonthItem,
  Category,
  Entry,
  MonthData,
  LocalPlan,
  LocalEntry,
} from "@/types"
import { ChevronLeft, ChevronRight, Calendar, Settings, LogIn } from "lucide-react"

const MONTHS_PER_PAGE = 12

function subscribeToLocalStorage(callback: () => void) {
  const handleStorage = () => callback()
  window.addEventListener("storage", handleStorage)
  window.addEventListener("localStorageUpdate", handleStorage)
  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener("localStorageUpdate", handleStorage)
  }
}

function dispatchLocalStorageUpdate() {
  window.dispatchEvent(new Event("localStorageUpdate"))
}

function localPlanToApiPlan(localPlan: LocalPlan, categories: Category[]): Plan {
  const category = categories.find((c) => c.id === localPlan.category_id)!
  return {
    ...localPlan,
    category,
  }
}

function localEntryToApiEntry(localEntry: LocalEntry, plans: Plan[]): Entry {
  const plan = plans.find((p) => p.id === localEntry.plan_id)!
  return {
    ...localEntry,
    plan,
  }
}

function calculateLocalBalances(
  monthIds: string[],
  plans: Plan[],
  entries: Entry[],
  startingBalance: number
): MonthData[] {
  const months: MonthData[] = []
  let cumulativeExpected = startingBalance
  let cumulativeActual = startingBalance

  for (const monthId of monthIds) {
    const monthPlans = plans.filter((plan) => {
      if (plan.status === "completed") return false
      const startMonth = plan.start_month
      const endMonth = plan.end_month
      if (plan.frequency === "one-time") {
        return startMonth === monthId
      }
      if (startMonth > monthId) return false
      if (endMonth && endMonth < monthId) return false
      return true
    })

    const monthEntries = entries.filter((entry) => entry.month_year === monthId)

    const items: MonthItem[] = []

    for (const plan of monthPlans) {
      const hasEntry = monthEntries.some((e) => e.plan_id === plan.id)
      if (!hasEntry) {
        items.push({
          type: "expected",
          plan,
          month_year: monthId,
        })
      }
    }

    for (const entry of monthEntries) {
      items.push({
        type: "entry",
        entry,
        month_year: monthId,
      })
    }

    const expectedIncome = monthPlans
      .filter((p) => p.category.type === "income")
      .reduce((sum, p) => sum + p.expected_amount, 0)
    const expectedExpense = monthPlans
      .filter((p) => p.category.type === "expense")
      .reduce((sum, p) => sum + p.expected_amount, 0)
    const expectedBalance = expectedIncome - expectedExpense

    const actualIncome = monthEntries
      .filter((e) => e.plan.category.type === "income")
      .reduce((sum, e) => sum + e.amount, 0)
    const actualExpense = monthEntries
      .filter((e) => e.plan.category.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0)
    const actualBalance = actualIncome - actualExpense

    cumulativeExpected += expectedBalance
    cumulativeActual += actualBalance

    const [year, month] = monthId.split("-")
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const name = `${monthNames[parseInt(month) - 1]} ${year}`

    months.push({
      id: monthId,
      name,
      items,
      expectedBalance,
      actualBalance,
      cumulativeExpected,
      cumulativeActual,
    })
  }

  return months
}

export function AnonymousApp() {
  const currentMonthId = useMemo(() => generateMonthId(new Date()), [])

  const [startDate, setStartDate] = useState(() => new Date())
  const monthIds = useMemo(
    () => generateMonthRange(generateMonthId(startDate), MONTHS_PER_PAGE),
    [startDate]
  )

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")
  const [editingItem, setEditingItem] = useState<MonthItem | null>(null)
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [, forceUpdate] = useState({})

  const cashflow = useSyncExternalStore(
    subscribeToLocalStorage,
    () => getOrCreateLocalCashflow(),
    () => getOrCreateLocalCashflow()
  )

  const categories = cashflow.categories
  const localPlans = cashflow.plans
  const localEntries = cashflow.entries
  const settings = cashflow.settings

  const plans: Plan[] = useMemo(
    () => localPlans.map((p) => localPlanToApiPlan(p, categories)),
    [localPlans, categories]
  )

  const entries: Entry[] = useMemo(
    () => localEntries.map((e) => localEntryToApiEntry(e, plans)),
    [localEntries, plans]
  )

  const startingBalance = useMemo(() => {
    const setting = settings.find((s) => s.key === "starting_balance")
    return parseFloat(setting?.value || "0")
  }, [settings])

  const chartScale = useMemo(() => {
    const setting = settings.find((s) => s.key === "chart_scale")
    return parseFloat(setting?.value || "40")
  }, [settings])

  const balanceScale = useMemo(() => {
    const setting = settings.find((s) => s.key === "balance_scale")
    return parseFloat(setting?.value || "40")
  }, [settings])

  const months = useMemo(
    () => calculateLocalBalances(monthIds, plans, entries, startingBalance),
    [monthIds, plans, entries, startingBalance]
  )

  const refreshData = useCallback(() => {
    dispatchLocalStorageUpdate()
    forceUpdate({})
  }, [])

  const handleSave = (data: { plan?: PlanCreate; entry?: EntryCreate }) => {
    if (data.plan && data.entry) {
      const newPlan = addLocalPlan(data.plan)
      addLocalEntry({
        ...data.entry,
        plan_id: newPlan.id,
      })
    } else if (data.plan) {
      addLocalPlan(data.plan)
    } else if (data.entry) {
      if (editingItem?.type === "entry" && editingItem.entry) {
        updateLocalEntry(editingItem.entry.id, {
          amount: data.entry.amount,
          date: data.entry.date,
          notes: data.entry.notes,
        })
      } else {
        addLocalEntry(data.entry)
      }
    }
    setEditingItem(null)
    refreshData()
  }

  const handleItemClick = (item: MonthItem) => {
    const category =
      item.type === "entry" ? item.entry!.plan.category : item.plan!.category
    setEntryType(category.type)
    setEditingItem(item)
    setShowAddModal(true)
  }

  const handleDeleteItem = (item: MonthItem) => {
    if (item.type === "entry" && item.entry) {
      deleteLocalEntry(item.entry.id)
    } else if (item.type === "expected" && item.plan) {
      deleteLocalPlan(item.plan.id)
    }
    refreshData()
  }

  const handleUpdatePlan = (id: string, data: PlanUpdate) => {
    updateLocalPlan(id, data)
    refreshData()
  }

  const handleUpdateSetting = (key: string, value: string) => {
    updateLocalSetting(key, value)
    refreshData()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const targetMonthId = over.id as string
    const dragData = active.data.current as { item: MonthItem; plan: Plan }

    if (dragData.item.month_year === targetMonthId) return

    updateLocalPlan(dragData.plan.id, { start_month: targetMonthId })
    refreshData()
  }

  const loadPreviousMonths = () => {
    setStartDate((d) => subMonths(d, MONTHS_PER_PAGE))
  }

  const loadNextMonths = () => {
    setStartDate((d) => addMonths(d, MONTHS_PER_PAGE))
  }

  const goToToday = () => {
    setStartDate(new Date())
  }

  const handleSaveToAccount = () => {
    localStorage.removeItem("cashflow_current_id")
    setPendingImport(true)
    loginWithGoogle()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const dateRange = `${months[0]?.name} — ${months[months.length - 1]?.name}`

  return (
    <div className="p-4 bg-background h-screen flex flex-col overflow-hidden">
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg mb-2 flex items-center justify-between">
        <span>Your changes are saved locally in this browser. Login to save permanently.</span>
        <Button size="sm" onClick={handleSaveToAccount} className="gap-2">
          <LogIn className="h-4 w-4" />
          Save to Account
        </Button>
      </div>

      <div className="flex items-center justify-between mb-2 gap-4">
        <h1 className="text-xl font-semibold">{cashflow.name}</h1>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={loadPreviousMonths}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday} className="gap-1">
            <Calendar className="h-4 w-4" />
            {dateRange}
          </Button>
          <Button variant="ghost" size="icon" onClick={loadNextMonths}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        <div className="flex gap-2 flex-1 overflow-x-auto overflow-y-auto pl-6 scrollbar-hide">
          {months.map((month, index) => {
            const prevTotal =
              index === 0
                ? startingBalance
                : months[index - 1].cumulativeExpected
            return (
              <MonthColumn
                key={month.id}
                month={month}
                isCurrentMonth={month.id === currentMonthId}
                isFirstMonth={index === 0}
                startingBalance={startingBalance}
                prevTotal={prevTotal}
                chartScale={chartScale}
                balanceScale={balanceScale}
                onItemClick={handleItemClick}
                onAddIncome={(monthId) => {
                  setEntryType("income")
                  setEditingItem(null)
                  setSelectedMonthId(monthId)
                  setShowAddModal(true)
                }}
                onAddSpend={(monthId) => {
                  setEntryType("expense")
                  setEditingItem(null)
                  setSelectedMonthId(monthId)
                  setShowAddModal(true)
                }}
              />
            )
          })}
        </div>
      </DndContext>

      <AddItemModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open)
          if (!open) {
            setEditingItem(null)
            setSelectedMonthId(null)
          }
        }}
        onSave={handleSave}
        onUpdatePlan={handleUpdatePlan}
        onDelete={handleDeleteItem}
        editingItem={editingItem}
        categories={categories}
        plans={plans}
        monthIds={monthIds}
        currentMonthId={selectedMonthId || monthIds[0]}
        entryType={entryType}
      />

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        settings={settings}
        onSave={handleUpdateSetting}
        canEdit={true}
      />
    </div>
  )
}
