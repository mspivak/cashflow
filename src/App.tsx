import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, subMonths } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/header"
import { MonthColumn } from "@/components/month-column"
import { ItemCard } from "@/components/item-card"
import { AddItemModal } from "@/components/add-item-modal"
import { SettingsModal } from "@/components/settings-modal"
import { CashflowChart } from "@/components/cashflow-chart"
import {
  useEntries,
  useCategories,
  useRecurring,
  useSettings,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
  useConfirmEntry,
  useUpdateSetting,
} from "@/hooks/use-items"
import {
  generateMonthId,
  generateMonthRange,
  calculateBalances,
} from "@/lib/calculations"
import type { Entry, EntryCreate } from "@/types"

const MONTHS_PER_PAGE = 12

export default function App() {
  // Current month ID for highlighting
  const currentMonthId = useMemo(() => generateMonthId(new Date()), [])

  // Month range state
  const [startDate, setStartDate] = useState(() => new Date())
  const monthIds = useMemo(
    () => generateMonthRange(generateMonthId(startDate), MONTHS_PER_PAGE),
    [startDate]
  )

  // UI state
  const [showChart, setShowChart] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")

  // Data fetching
  const { data: entries = [], isLoading: entriesLoading } = useEntries()
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const { data: recurring = [], isLoading: recurringLoading } = useRecurring()
  const { data: settings = [], isLoading: settingsLoading } = useSettings()

  // Mutations
  const createEntry = useCreateEntry()
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()
  const confirmEntry = useConfirmEntry()
  const updateSetting = useUpdateSetting()

  // Calculate starting balance
  const startingBalance = useMemo(() => {
    const setting = settings.find((s) => s.key === "starting_balance")
    return parseFloat(setting?.value || "0")
  }, [settings])

  // Calculate month data with balances
  const months = useMemo(
    () => calculateBalances(monthIds, entries, recurring, startingBalance),
    [monthIds, entries, recurring, startingBalance]
  )

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    // Find entry in months
    for (const month of months) {
      const entry = month.entries.find((e) => e.id === event.active.id)
      if (entry) {
        setActiveEntry(entry)
        break
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null)
    const { active, over } = event

    if (!over) return

    const entryId = active.id as string
    const targetMonthId = over.id as string

    // Don't allow dragging placeholder entries
    if (entryId.startsWith("recurring-")) return

    // Check if dropping on a month column
    if (monthIds.includes(targetMonthId)) {
      // Find the entry
      for (const month of months) {
        const entry = month.entries.find((e) => e.id === entryId)
        if (entry && entry.month_year !== targetMonthId) {
          updateEntry.mutate({
            id: entryId,
            entry: { month_year: targetMonthId },
          })
          break
        }
      }
    }
  }

  const handleSaveEntry = (entryData: EntryCreate) => {
    if (editingEntry) {
      updateEntry.mutate({
        id: editingEntry.id,
        entry: entryData,
      })
    } else {
      createEntry.mutate(entryData)
    }
    setEditingEntry(null)
  }

  const handleEditEntry = (entry: Entry) => {
    const category = categories.find((c) => c.id === entry.category_id)
    setEntryType(category?.type === "income" ? "income" : "expense")
    setEditingEntry(entry)
    setShowAddModal(true)
  }

  const handleDeleteEntry = (entry: Entry) => {
    deleteEntry.mutate(entry.id)
  }

  const handleConfirmEntry = (entry: Entry) => {
    confirmEntry.mutate({ id: entry.id })
  }

  const handleUpdateSetting = (key: string, value: string) => {
    updateSetting.mutate({ key, value })
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

  const isLoading = entriesLoading || categoriesLoading || recurringLoading || settingsLoading

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
          setEditingEntry(null)
          setShowAddModal(true)
        }}
        onAddSpend={() => {
          setEntryType("expense")
          setEditingEntry(null)
          setShowAddModal(true)
        }}
      />

      {showChart && <CashflowChart months={months} />}

      {/* Timeline navigation */}
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

      {/* Month columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 pb-4">
          {months.map((month) => (
            <MonthColumn
              key={month.id}
              month={month}
              isCurrentMonth={month.id === currentMonthId}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
              onConfirmEntry={handleConfirmEntry}
            />
          ))}
        </div>

        <DragOverlay>
          {activeEntry ? (
            <ItemCard
              entry={activeEntry}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddItemModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open)
          if (!open) setEditingEntry(null)
        }}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        categories={categories}
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
