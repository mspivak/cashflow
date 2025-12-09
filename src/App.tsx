import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, subMonths } from "date-fns"
import { DndContext, DragEndEvent, pointerWithin, useSensor, useSensors, PointerSensor } from "@dnd-kit/core"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/header"
import { MonthColumn } from "@/components/month-column"
import { AddItemModal } from "@/components/add-item-modal"
import { SettingsModal } from "@/components/settings-modal"
import { CashflowChart } from "@/components/cashflow-chart"
import {
  useEntries,
  useCategories,
  usePlans,
  useSettings,
  useCreatePlan,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
  useDeletePlan,
  useUpdatePlan,
  useUpdateSetting,
} from "@/hooks/use-items"
import {
  generateMonthId,
  generateMonthRange,
  calculateBalances,
} from "@/lib/calculations"
import type { Plan, PlanCreate, PlanUpdate, EntryCreate, MonthItem } from "@/types"

const MONTHS_PER_PAGE = 12

export default function App() {
  const currentMonthId = useMemo(() => generateMonthId(new Date()), [])

  const [startDate, setStartDate] = useState(() => new Date())
  const monthIds = useMemo(
    () => generateMonthRange(generateMonthId(startDate), MONTHS_PER_PAGE),
    [startDate]
  )

  const [showChart, setShowChart] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")
  const [editingItem, setEditingItem] = useState<MonthItem | null>(null)

  const { data: entries = [], isLoading: entriesLoading } = useEntries()
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const { data: settings = [], isLoading: settingsLoading } = useSettings()

  const createPlan = useCreatePlan()
  const createEntry = useCreateEntry()
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()
  const deletePlan = useDeletePlan()
  const updatePlan = useUpdatePlan()
  const updateSetting = useUpdateSetting()

  const startingBalance = useMemo(() => {
    const setting = settings.find((s) => s.key === "starting_balance")
    return parseFloat(setting?.value || "0")
  }, [settings])

  const months = useMemo(
    () => calculateBalances(monthIds, plans, entries, startingBalance),
    [monthIds, plans, entries, startingBalance]
  )

  const handleSave = (data: { plan?: PlanCreate; entry?: EntryCreate }) => {
    if (data.plan && data.entry) {
      createPlan.mutate(data.plan, {
        onSuccess: (newPlan) => {
          createEntry.mutate({
            ...data.entry!,
            plan_id: newPlan.id,
          })
        },
      })
    } else if (data.plan) {
      createPlan.mutate(data.plan)
    } else if (data.entry) {
      if (editingItem?.type === "entry" && editingItem.entry) {
        updateEntry.mutate({
          id: editingItem.entry.id,
          entry: {
            amount: data.entry.amount,
            date: data.entry.date,
            notes: data.entry.notes,
          },
        })
      } else {
        createEntry.mutate(data.entry)
      }
    }
    setEditingItem(null)
  }

  const handleItemClick = (item: MonthItem) => {
    const category = item.type === "entry"
      ? item.entry!.plan.category
      : item.plan!.category
    setEntryType(category.type)
    setEditingItem(item)
    setShowAddModal(true)
  }

  const handleDeleteItem = (item: MonthItem) => {
    if (item.type === "entry" && item.entry) {
      deleteEntry.mutate(item.entry.id)
    } else if (item.type === "expected" && item.plan) {
      deletePlan.mutate(item.plan.id)
    }
  }

  const handleUpdatePlan = (id: string, data: PlanUpdate) => {
    updatePlan.mutate({ id, plan: data })
  }

  const handleUpdateSetting = (key: string, value: string) => {
    updateSetting.mutate({ key, value })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const targetMonthId = over.id as string
    const dragData = active.data.current as { item: MonthItem; plan: Plan }

    if (dragData.item.month_year === targetMonthId) return

    updatePlan.mutate({
      id: dragData.plan.id,
      plan: { start_month: targetMonthId },
    })
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const isLoading = entriesLoading || categoriesLoading || plansLoading || settingsLoading

  if (isLoading) {
    return (
      <div className="p-4 bg-background min-h-screen">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex gap-2 pb-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-64 flex-1 min-w-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-background min-h-screen">
      <Header
        startingBalance={startingBalance}
        showChart={showChart}
        onToggleChart={() => setShowChart(!showChart)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onAddIncome={() => {
          setEntryType("income")
          setEditingItem(null)
          setShowAddModal(true)
        }}
        onAddSpend={() => {
          setEntryType("expense")
          setEditingItem(null)
          setShowAddModal(true)
        }}
      />

      {showChart && <CashflowChart months={months} />}

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={loadPreviousMonths}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] text-muted-foreground">
          {months[0]?.name} — {months[months.length - 1]?.name}
        </span>
        <button
          onClick={loadNextMonths}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={goToToday}
          className="ml-2 px-2 py-0.5 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
        >
          Today
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
        <div className="flex gap-2 pb-4 overflow-x-auto">
          {months.map((month, index) => (
            <MonthColumn
              key={month.id}
              month={month}
              isCurrentMonth={month.id === currentMonthId}
              isFirstMonth={index === 0}
              startingBalance={startingBalance}
              onItemClick={handleItemClick}
            />
          ))}
        </div>
      </DndContext>

      <AddItemModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open)
          if (!open) setEditingItem(null)
        }}
        onSave={handleSave}
        onUpdatePlan={handleUpdatePlan}
        onDelete={handleDeleteItem}
        editingItem={editingItem}
        categories={categories}
        plans={plans}
        monthIds={monthIds}
        currentMonthId={monthIds[0]}
        entryType={entryType}
      />

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        settings={settings}
        onSave={handleUpdateSetting}
      />
    </div>
  )
}
