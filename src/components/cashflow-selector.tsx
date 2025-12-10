import { useState } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Cashflow } from "@/types"

interface CashflowSelectorProps {
  cashflows: Cashflow[]
  currentCashflow: Cashflow | null
  onSelect: (cashflow: Cashflow) => void
  onCreateNew: (name: string, description?: string) => void
}

export function CashflowSelector({
  cashflows,
  currentCashflow,
  onSelect,
  onCreateNew,
}: CashflowSelectorProps) {
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")

  const handleCreate = () => {
    console.log("handleCreate called, newName:", newName)
    if (newName.trim()) {
      console.log("Calling onCreateNew with:", newName.trim())
      onCreateNew(newName.trim(), newDescription.trim() || undefined)
      setNewName("")
      setNewDescription("")
      setShowNewDialog(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            {currentCashflow?.name || "Select..."}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {cashflows.map((cf) => (
            <DropdownMenuItem
              key={cf.id}
              onClick={() => onSelect(cf)}
              className={cf.id === currentCashflow?.id ? "bg-accent" : ""}
            >
              <span className="truncate max-w-[200px]">{cf.name}</span>
              {cf.role !== "owner" && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({cf.role})
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Personal, Business, Vacation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
