import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Setting } from "@/types"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Setting[]
  onSave: (key: string, value: string) => void
}

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  onSave,
}: SettingsModalProps) {
  const [startingBalance, setStartingBalance] = useState("")
  const [chartScale, setChartScale] = useState("40")
  const [balanceScale, setBalanceScale] = useState("40")

  useEffect(() => {
    const balanceSetting = settings.find((s) => s.key === "starting_balance")
    if (balanceSetting) {
      setStartingBalance(balanceSetting.value)
    }
    const scaleSetting = settings.find((s) => s.key === "chart_scale")
    if (scaleSetting) {
      setChartScale(scaleSetting.value)
    }
    const balanceScaleSetting = settings.find((s) => s.key === "balance_scale")
    if (balanceScaleSetting) {
      setBalanceScale(balanceScaleSetting.value)
    }
  }, [settings])

  const handleSave = () => {
    onSave("starting_balance", startingBalance)
    onSave("chart_scale", chartScale)
    onSave("balance_scale", balanceScale)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="starting-balance">Starting Balance ($)</Label>
            <Input
              id="starting-balance"
              type="number"
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Your current bank balance. Cumulative calculations will start from
              this amount.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chart-scale">Chart Scale (px per $1000)</Label>
            <Input
              id="chart-scale"
              type="number"
              step="1"
              min="1"
              value={chartScale}
              onChange={(e) => setChartScale(e.target.value)}
              placeholder="40"
            />
            <p className="text-xs text-muted-foreground">
              Height in pixels for each $1000. Higher values = taller bars.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance-scale">Balance Scale (px per $1000)</Label>
            <Input
              id="balance-scale"
              type="number"
              step="1"
              min="1"
              value={balanceScale}
              onChange={(e) => setBalanceScale(e.target.value)}
              placeholder="40"
            />
            <p className="text-xs text-muted-foreground">
              Height in pixels for each $1000 of cumulative balance.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
