import { Plus, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  startingBalance: number
  onOpenSettings: () => void
  onAddIncome: () => void
  onAddSpend: () => void
  dateRange: string
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export function Header({
  startingBalance,
  onOpenSettings,
  onAddIncome,
  onAddSpend,
  dateRange,
  onPrevious,
  onNext,
  onToday,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Cashflow</h1>
        <span className="text-xs text-muted-foreground">
          Balance: <span className="font-medium text-foreground">${startingBalance.toLocaleString()}</span>
        </span>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onPrevious}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] text-muted-foreground">{dateRange}</span>
          <button
            onClick={onNext}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={onToday}
            className="ml-1 px-2 py-0.5 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            Today
          </button>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="h-7 text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
        <Button size="sm" onClick={onAddIncome} className="h-7 text-xs bg-green-600 hover:bg-green-700">
          <Plus className="h-3 w-3 mr-1" />
          Income
        </Button>
        <Button size="sm" onClick={onAddSpend} className="h-7 text-xs bg-gray-600 hover:bg-gray-700">
          <Plus className="h-3 w-3 mr-1" />
          Spend
        </Button>
      </div>
    </div>
  )
}
