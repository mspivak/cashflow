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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/header"
import { MonthColumn } from "@/components/month-column"
import { ItemCard } from "@/components/item-card"
import { AddItemModal } from "@/components/add-item-modal"
import { SettingsModal } from "@/components/settings-modal"
import { CashflowChart } from "@/components/cashflow-chart"
import {
  useItems,
  useSettings,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useMoveItem,
  useUpdateSetting,
} from "@/hooks/use-items"
import {
  generateMonthId,
  generateMonthRange,
  calculateBalances,
} from "@/lib/calculations"
import type { Item, ItemCreate } from "@/types"

const MONTHS_PER_PAGE = 12

export default function App() {
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
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [activeItem, setActiveItem] = useState<Item | null>(null)

  // Data fetching
  const { data: items = [], isLoading: itemsLoading } = useItems()
  const { data: settings = [], isLoading: settingsLoading } = useSettings()

  // Mutations
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const moveItem = useMoveItem()
  const updateSetting = useUpdateSetting()

  // Calculate starting balance
  const startingBalance = useMemo(() => {
    const setting = settings.find((s) => s.key === "starting_balance")
    return parseFloat(setting?.value || "0")
  }, [settings])

  // Calculate month data with balances
  const months = useMemo(
    () => calculateBalances(monthIds, items, startingBalance),
    [monthIds, items, startingBalance]
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
    const item = items.find((i) => i.id === event.active.id)
    if (item) setActiveItem(item)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null)
    const { active, over } = event

    if (!over) return

    const itemId = active.id as string
    const targetMonthId = over.id as string

    // Check if dropping on a month column
    if (monthIds.includes(targetMonthId)) {
      const item = items.find((i) => i.id === itemId)
      if (item && item.month_year !== targetMonthId) {
        moveItem.mutate({ id: itemId, monthYear: targetMonthId })
      }
    }
  }

  const handleSaveItem = (itemData: ItemCreate) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, item: itemData })
    } else {
      createItem.mutate(itemData)
    }
    setEditingItem(null)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setShowAddModal(true)
  }

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id)
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

  const isLoading = itemsLoading || settingsLoading

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
        onAddItem={() => {
          setEditingItem(null)
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
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? (
            <ItemCard
              item={activeItem}
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
          if (!open) setEditingItem(null)
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
        monthIds={monthIds}
        currentMonthId={monthIds[0]}
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
