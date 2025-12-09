import { Plus, Settings, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  startingBalance: number
  showChart: boolean
  onToggleChart: () => void
  onOpenSettings: () => void
  onAddIncome: () => void
  onAddSpend: () => void
}

export function Header({
  startingBalance,
  showChart,
  onToggleChart,
  onOpenSettings,
  onAddIncome,
  onAddSpend,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">Cashflow</h1>
        <span className="text-xs text-muted-foreground">
          Balance: <span className="font-medium text-foreground">${startingBalance.toLocaleString()}</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant={showChart ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleChart}
          className="h-7 text-xs"
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          Chart
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="h-7 text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
        <Button size="sm" onClick={onAddIncome} className="h-7 text-xs bg-green-600 hover:bg-green-700">
          <Plus className="h-3 w-3 mr-1" />
          Income
        </Button>
        <Button size="sm" onClick={onAddSpend} className="h-7 text-xs bg-red-600 hover:bg-red-700">
          <Plus className="h-3 w-3 mr-1" />
          Spend
        </Button>
      </div>
    </div>
  )
}
