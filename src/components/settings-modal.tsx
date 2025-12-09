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

  useEffect(() => {
    const balanceSetting = settings.find((s) => s.key === "starting_balance")
    if (balanceSetting) {
      setStartingBalance(balanceSetting.value)
    }
  }, [settings])

  const handleSave = () => {
    onSave("starting_balance", startingBalance)
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
