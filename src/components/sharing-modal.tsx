import { useState } from "react"
import { Trash2, UserPlus, Copy, Check, Globe, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { CashflowMember, MemberRole } from "@/types"

interface SharingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: CashflowMember[]
  onInvite: (email: string, role: MemberRole) => void
  onUpdateRole: (userId: string, role: MemberRole) => void
  onRemove: (userId: string) => void
  isOwner: boolean
  shareId?: string
  isPublic?: boolean
  onTogglePublic?: (isPublic: boolean) => void
}

export function SharingModal({
  open,
  onOpenChange,
  members,
  onInvite,
  onUpdateRole,
  onRemove,
  isOwner,
  shareId,
  isPublic,
  onTogglePublic,
}: SharingModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("viewer")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const publicUrl = shareId ? `${window.location.origin}/s/${shareId}` : ""

  const handleCopyLink = async () => {
    if (publicUrl) {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleInvite = () => {
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!email.includes("@")) {
      setError("Invalid email")
      return
    }
    setError("")
    onInvite(email.trim(), role)
    setEmail("")
    setRole("viewer")
  }

  const getInitials = (member: CashflowMember) => {
    if (member.name) {
      return member.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return member.email[0].toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Budget</DialogTitle>
        </DialogHeader>

        {isOwner && shareId && onTogglePublic && (
          <div className="space-y-4 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="public-toggle" className="text-sm font-medium cursor-pointer">
                    Public Link
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isPublic ? "Anyone with the link can view and edit" : "Only members can access"}
                  </p>
                </div>
              </div>
              <Switch
                id="public-toggle"
                checked={isPublic}
                onCheckedChange={onTogglePublic}
              />
            </div>
            {isPublic && publicUrl && (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={publicUrl}
                  className="text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {isOwner && (
          <div className="space-y-4 border-b pb-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="flex-1"
                />
                <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <Button onClick={handleInvite} size="sm" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Send Invite
            </Button>
            <p className="text-xs text-muted-foreground">
              The user must have an account. They'll see this budget after logging in.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Members ({members.length})</Label>
          <div className="space-y-2 max-h-64 overflow-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name || member.email}</p>
                    {member.name && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === "owner" ? (
                    <span className="text-xs text-muted-foreground px-2">Owner</span>
                  ) : isOwner ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(v) => onUpdateRole(member.user_id, v as MemberRole)}
                      >
                        <SelectTrigger className="h-7 w-20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => onRemove(member.user_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground px-2 capitalize">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
