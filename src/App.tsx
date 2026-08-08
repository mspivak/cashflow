import { useState, useMemo } from "react"
import { addMonths, subMonths } from "date-fns"
import { toast } from "sonner"
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
  useUpdateShareSettings,
} from "@/hooks/use-items"
import {
  generateMonthId,
  generateMonthRange,
  calculateBalances,
  getBoardMaxima,
} from "@/lib/calculations"
import type {
  Plan,
  PlanCreate,
  PlanUpdate,
  EntryCreate,
  MonthItem,
  MemberRole,
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
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)

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
  const updateShareSettings = useUpdateShareSettings()

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

  const maxima = useMemo(
    () => getBoardMaxima(months, startingBalance),
    [months, startingBalance]
  )

  const isBoardEmpty = plans.length === 0 && entries.length === 0

  const handleSave = (data: { plan?: PlanCreate; entry?: EntryCreate }) => {
    if (!canEdit) return

    if (data.plan && data.entry) {
      createPlan.mutate(data.plan, {
        onSuccess: (newPlan) => {
          createEntry.mutate(
            {
              ...data.entry!,
              plan_id: newPlan.id,
            },
            {
              onSuccess: () => {
                toast.success(`Recorded $${data.entry!.amount.toLocaleString()} for "${data.plan!.name}"`)
              },
            }
          )
        },
      })
    } else if (data.plan) {
      createPlan.mutate(data.plan, {
        onSuccess: () => {
          toast.success(`Plan "${data.plan!.name}" added`)
        },
      })
    } else if (data.entry) {
      if (editingItem?.type === "entry" && editingItem.entry) {
        updateEntry.mutate(
          {
            id: editingItem.entry.id,
            entry: {
              amount: data.entry.amount,
              date: data.entry.date,
              notes: data.entry.notes,
            },
          },
          {
            onSuccess: () => {
              toast.success("Entry updated")
            },
          }
        )
      } else {
        createEntry.mutate(data.entry, {
          onSuccess: () => {
            toast.success(`Recorded $${data.entry!.amount.toLocaleString()}`)
          },
        })
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
      const removed = item.entry
      deleteEntry.mutate(removed.id, {
        onSuccess: () => {
          toast("Entry deleted", {
            action: {
              label: "Undo",
              onClick: () => {
                createEntry.mutate({
                  plan_id: removed.plan_id,
                  month_year: removed.month_year,
                  amount: removed.amount,
                  date: removed.date,
                  notes: removed.notes,
                })
              },
            },
          })
        },
      })
    } else if (item.type === "expected" && item.plan) {
      const removedPlan = item.plan
      const removedEntries = entries.filter((e) => e.plan_id === removedPlan.id)
      deletePlan.mutate(removedPlan.id, {
        onSuccess: () => {
          toast(`Deleted "${removedPlan.name}"`, {
            action: {
              label: "Undo",
              onClick: () => {
                createPlan.mutate(
                  {
                    category_id: removedPlan.category_id,
                    name: removedPlan.name,
                    expected_amount: removedPlan.expected_amount,
                    frequency: removedPlan.frequency,
                    expected_day: removedPlan.expected_day,
                    start_month: removedPlan.start_month,
                    end_month: removedPlan.end_month,
                    notes: removedPlan.notes,
                  },
                  {
                    onSuccess: (newPlan) => {
                      for (const e of removedEntries) {
                        createEntry.mutate({
                          plan_id: newPlan.id,
                          month_year: e.month_year,
                          amount: e.amount,
                          date: e.date,
                          notes: e.notes,
                        })
                      }
                    },
                  }
                )
              },
            },
          })
        },
      })
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
    createCashflow.mutate(
      { name, description },
      {
        onSuccess: (newCashflow) => {
          setCurrentCashflow(newCashflow)
          toast.success(`"${newCashflow.name}" created`)
        },
      }
    )
  }

  const handleInviteMember = (email: string, role: MemberRole) => {
    inviteMember.mutate(
      { cashflowId, email, role },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${email}`)
        },
      }
    )
  }

  const handleUpdateMemberRole = (userId: string, role: MemberRole) => {
    updateMemberRole.mutate({ cashflowId, userId, role })
  }

  const handleRemoveMember = (userId: string) => {
    removeMember.mutate({ cashflowId, userId })
  }

  const handleTogglePublic = (isPublic: boolean) => {
    updateShareSettings.mutate({ id: cashflowId, isPublic })
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
        onOpenSharing={() => setShowSharingModal(true)}
      />

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        <div className="flex gap-2 flex-1 overflow-x-auto overflow-y-auto pl-6">
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
                isBoardEmpty={isBoardEmpty}
                startingBalance={startingBalance}
                prevTotal={prevTotal}
                chartScale={chartScale}
                balanceScale={balanceScale}
                maxima={maxima}
                onItemClick={handleItemClick}
                onAddIncome={canEdit ? (monthId) => {
                  setEntryType("income")
                  setEditingItem(null)
                  setSelectedMonthId(monthId)
                  setShowAddModal(true)
                } : undefined}
                onAddSpend={canEdit ? (monthId) => {
                  setEntryType("expense")
                  setEditingItem(null)
                  setSelectedMonthId(monthId)
                  setShowAddModal(true)
                } : undefined}
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
        entries={entries}
        monthIds={monthIds}
        currentMonthId={selectedMonthId || monthIds[0]}
        entryType={entryType}
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
        shareId={currentCashflow?.share_id}
        isPublic={currentCashflow?.is_public}
        onTogglePublic={handleTogglePublic}
      />
    </div>
  )
}
