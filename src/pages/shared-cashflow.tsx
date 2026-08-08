import { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { addMonths, subMonths } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { MonthColumn } from "@/components/month-column"
import { SettingsModal } from "@/components/settings-modal"
import { BoardLegend } from "@/components/board-legend"
import {
  usePublicCashflow,
  usePublicCategories,
  usePublicPlans,
  usePublicEntries,
  usePublicSettings,
} from "@/hooks/use-items"
import {
  generateMonthId,
  generateMonthRange,
  calculateBalances,
  getBoardMaxima,
} from "@/lib/calculations"
import { ChevronLeft, ChevronRight, Calendar, Settings, Eye } from "lucide-react"

const MONTHS_PER_PAGE = 12

export function SharedCashflowPage() {
  const { shareId } = useParams<{ shareId: string }>()

  const currentMonthId = useMemo(() => generateMonthId(new Date()), [])

  const [startDate, setStartDate] = useState(() => new Date())
  const monthIds = useMemo(
    () => generateMonthRange(generateMonthId(startDate), MONTHS_PER_PAGE),
    [startDate]
  )

  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const { data: cashflow, isLoading: cashflowLoading, isError } = usePublicCashflow(shareId || "")
  const { data: entries = [], isLoading: entriesLoading } = usePublicEntries(shareId || "")
  const { isLoading: categoriesLoading } = usePublicCategories(shareId || "")
  const { data: plans = [], isLoading: plansLoading } = usePublicPlans(shareId || "")
  const { data: settings = [], isLoading: settingsLoading } = usePublicSettings(shareId || "")

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

  const loadPreviousMonths = () => {
    setStartDate((d) => subMonths(d, MONTHS_PER_PAGE))
  }

  const loadNextMonths = () => {
    setStartDate((d) => addMonths(d, MONTHS_PER_PAGE))
  }

  const goToToday = () => {
    setStartDate(new Date())
  }

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
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Shared cashflow · view only
          </div>
          <h1 className="text-xl font-semibold">{cashflow?.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Previous months" onClick={loadPreviousMonths}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday} className="gap-1">
            <Calendar className="h-4 w-4" />
            {dateRange}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next months" onClick={loadNextMonths}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="View settings" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <Link to="/login">
          <Button variant="outline" size="sm">
            Login to save your own
          </Button>
        </Link>
      </div>

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
              startingBalance={startingBalance}
              prevTotal={prevTotal}
              chartScale={chartScale}
              balanceScale={balanceScale}
              maxima={maxima}
              interactive={false}
              onItemClick={() => {}}
            />
          )
        })}
      </div>

      <BoardLegend />

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        settings={settings}
        onSave={() => {}}
        canEdit={false}
      />
    </div>
  )
}
