import { useState, useMemo } from "react"
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
import { Header } from "@/components/header"
import { MonthColumn } from "@/components/month-column"
import { AddItemModal } from "@/components/add-item-modal"
import { SettingsModal } from "@/components/settings-modal"
import { SharingModal } from "@/components/sharing-modal"
import { useCashflowContext } from "@/context/cashflow-context"
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
  useCurrentUser,
  useLogout,
  useCashflows,
  useCreateCashflow,
  useCashflowMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
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

const MONTHS_PER_PAGE = 12

export default function App() {
  const { currentCashflow, setCurrentCashflow, userRole } = useCashflowContext()
  const cashflowId = currentCashflow?.id || ""

  const currentMonthId = useMemo(() => generateMonthId(new Date()), [])

  const [startDate, setStartDate] = useState(() => new Date())
  const monthIds = useMemo(
    () => generateMonthRange(generateMonthId(startDate), MONTHS_PER_PAGE),
    [startDate]
  )

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSharingModal, setShowSharingModal] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")
  const [editingItem, setEditingItem] = useState<MonthItem | null>(null)

  const { data: user } = useCurrentUser()
  const { data: cashflows = [] } = useCashflows()
  const logout = useLogout()
  const createCashflow = useCreateCashflow()

  const { data: entries = [], isLoading: entriesLoading } = useEntries(cashflowId)
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(cashflowId)
  const { data: plans = [], isLoading: plansLoading } = usePlans(cashflowId)
  const { data: settings = [], isLoading: settingsLoading } = useSettings(cashflowId)

  const createPlan = useCreatePlan(cashflowId)
  const createEntry = useCreateEntry(cashflowId)
  const updateEntry = useUpdateEntry(cashflowId)
  const deleteEntry = useDeleteEntry(cashflowId)
  const deletePlan = useDeletePlan(cashflowId)
  const updatePlan = useUpdatePlan(cashflowId)
  const updateSetting = useUpdateSetting(cashflowId)

  const { data: members = [] } = useCashflowMembers(cashflowId)
  const inviteMember = useInviteMember()
  const updateMemberRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  const canEdit = userRole === "owner" || userRole === "editor"
  const isOwner = userRole === "owner"

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
    if (!canEdit) return

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
    if (!canEdit) return

    if (item.type === "entry" && item.entry) {
      deleteEntry.mutate(item.entry.id)
    } else if (item.type === "expected" && item.plan) {
      deletePlan.mutate(item.plan.id)
    }
  }

  const handleUpdatePlan = (id: string, data: PlanUpdate) => {
    if (!canEdit) return
    updatePlan.mutate({ id, plan: data })
  }

  const handleUpdateSetting = (key: string, value: string) => {
    if (!canEdit) return
    updateSetting.mutate({ key, value })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canEdit) return

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

  const handleCreateCashflow = (name: string, description?: string) => {
    console.log("handleCreateCashflow called with:", name, description)
    createCashflow.mutate(
      { name, description },
      {
        onSuccess: (newCashflow) => {
          console.log("Cashflow created:", newCashflow)
          setCurrentCashflow(newCashflow)
        },
        onError: (error) => {
          console.error("Failed to create cashflow:", error)
        },
      }
    )
  }

  const handleInviteMember = (email: string, role: "editor" | "viewer") => {
    inviteMember.mutate({ cashflowId, email, role })
  }

  const handleUpdateMemberRole = (userId: string, role: "editor" | "viewer") => {
    updateMemberRole.mutate({ cashflowId, userId, role })
  }

  const handleRemoveMember = (userId: string) => {
    removeMember.mutate({ cashflowId, userId })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const isLoading =
    !cashflowId || entriesLoading || categoriesLoading || plansLoading || settingsLoading

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
    <div className="p-4 bg-background h-screen flex flex-col overflow-hidden">
      <Header
        startingBalance={startingBalance}
        onOpenSettings={() => setShowSettingsModal(true)}
        onAddIncome={() => {
          if (!canEdit) return
          setEntryType("income")
          setEditingItem(null)
          setShowAddModal(true)
        }}
        onAddSpend={() => {
          if (!canEdit) return
          setEntryType("expense")
          setEditingItem(null)
          setShowAddModal(true)
        }}
        dateRange={`${months[0]?.name} — ${months[months.length - 1]?.name}`}
        onPrevious={loadPreviousMonths}
        onNext={loadNextMonths}
        onToday={goToToday}
        user={user!}
        cashflows={cashflows}
        currentCashflow={currentCashflow}
        onSelectCashflow={setCurrentCashflow}
        onCreateCashflow={handleCreateCashflow}
        onLogout={() => logout.mutate()}
        canEdit={canEdit}
        onOpenSharing={() => setShowSharingModal(true)}
      />

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
              />
            )
          })}
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
        canEdit={canEdit}
      />

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        settings={settings}
        onSave={handleUpdateSetting}
        canEdit={canEdit}
      />

      <SharingModal
        open={showSharingModal}
        onOpenChange={setShowSharingModal}
        members={members}
        onInvite={handleInviteMember}
        onUpdateRole={handleUpdateMemberRole}
        onRemove={handleRemoveMember}
        isOwner={isOwner}
      />
    </div>
  )
}
