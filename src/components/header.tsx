import { Settings, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CashflowSelector } from "@/components/cashflow-selector"
import { UserMenu } from "@/components/user-menu"
import type { User, Cashflow } from "@/types"

interface HeaderProps {
  startingBalance: number
  onOpenSettings: () => void
  dateRange: string
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  user: User
  cashflows: Cashflow[]
  currentCashflow: Cashflow | null
  onSelectCashflow: (cashflow: Cashflow) => void
  onCreateCashflow: (name: string, description?: string) => void
  onLogout: () => void
  onOpenSharing?: () => void
}

export function Header({
  startingBalance,
  onOpenSettings,
  dateRange,
  onPrevious,
  onNext,
  onToday,
  user,
  cashflows,
  currentCashflow,
  onSelectCashflow,
  onCreateCashflow,
  onLogout,
  onOpenSharing,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Cashflow</h1>
        <CashflowSelector
          cashflows={cashflows}
          currentCashflow={currentCashflow}
          onSelect={onSelectCashflow}
          onCreateNew={onCreateCashflow}
        />
        <span className="text-xs text-muted-foreground">
          Starting balance: <span className="font-medium text-foreground">${startingBalance.toLocaleString()}</span>
        </span>
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous months"
            onClick={onPrevious}
            className="h-6 w-6 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[11px] text-muted-foreground">{dateRange}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next months"
            onClick={onNext}
            className="h-6 w-6 text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="ml-1 h-6 px-2 text-[11px]"
          >
            Today
          </Button>
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        {onOpenSharing && (
          <Button variant="ghost" size="sm" onClick={onOpenSharing} className="h-7 text-xs">
            <Users className="h-3 w-3 mr-1" />
            Share
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="h-7 text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </div>
  )
}
