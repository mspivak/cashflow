import { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { addMonths, subMonths } from "date-fns"
import {
  DndContext,
  DragEndEvent,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { MonthColumn } from "@/components/month-column"
import { AddItemModal } from "@/components/add-item-modal"
import { SettingsModal } from "@/components/settings-modal"
import {
  usePublicCashflow,
  usePublicCategories,
  usePublicPlans,
  usePublicEntries,
  usePublicSettings,
  useCreatePublicPlan,
  useCreatePublicEntry,
  useUpdatePublicEntry,
  useDeletePublicEntry,
  useDeletePublicPlan,
  useUpdatePublicPlan,
  useUpdatePublicSetting,
} from "@/hooks/use-items"
import {
  generateMonthId,
  generateMonthRange,
  calculateBalances,
} from "@/lib/calculations"
import type {
  Plan,
  PlanCreate,
  PlanUpdate,
  EntryCreate,
  MonthItem,
} from "@/types"
import { ChevronLeft, ChevronRight, Calendar, Settings } from "lucide-react"

const MONTHS_PER_PAGE = 12

export function SharedCashflowPage() {
  const { shareId } = useParams<{ shareId: string }>()

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

  const { data: cashflow, isLoading: cashflowLoading, isError } = usePublicCashflow(shareId || "")
  const { data: entries = [], isLoading: entriesLoading } = usePublicEntries(shareId || "")
  const { data: categories = [], isLoading: categoriesLoading } = usePublicCategories(shareId || "")
  const { data: plans = [], isLoading: plansLoading } = usePublicPlans(shareId || "")
  const { data: settings = [], isLoading: settingsLoading } = usePublicSettings(shareId || "")

  const createPlan = useCreatePublicPlan(shareId || "")
  const createEntry = useCreatePublicEntry(shareId || "")
  const updateEntry = useUpdatePublicEntry(shareId || "")
  const deleteEntry = useDeletePublicEntry(shareId || "")
  const deletePlan = useDeletePublicPlan(shareId || "")
  const updatePlan = useUpdatePublicPlan(shareId || "")
  const updateSetting = useUpdatePublicSetting(shareId || "")

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
    const category =
      item.type === "entry" ? item.entry!.plan.category : item.plan!.category
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

  const isLoading =
    cashflowLoading || entriesLoading || categoriesLoading || plansLoading || settingsLoading

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold mb-4">Cashflow not found</h1>
        <p className="text-muted-foreground mb-6">This cashflow doesn't exist or is not publicly shared.</p>
        <Link to="/login">
          <Button>Go to Login</Button>
        </Link>
      </div>
    )
  }

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

  const dateRange = `${months[0]?.name} — ${months[months.length - 1]?.name}`

  return (
    <div className="p-4 bg-background h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
            Shared Cashflow
          </div>
          <h1 className="text-xl font-semibold">{cashflow?.name}</h1>
        </div>

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

        <Link to="/login">
          <Button variant="outline" size="sm">
            Login to save your own
          </Button>
        </Link>
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
