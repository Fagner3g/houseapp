import { Plus } from 'lucide-react'
import { useState } from 'react'

import { useListUsersByOrg } from '@/api/generated/api'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NewUserDialog } from '@/features/settings/components/new-user-dialog'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { getSplitEligibleOrgUsers } from '@/lib/org-users'
import { stackyDrawerAddButton } from '@/lib/ui-classes'
import { useAuthStore } from '@/stores/auth'

interface MemberSelectProps {
  value: string | null
  onChange: (userId: string | null) => void
  className?: string
  creatable?: boolean
  disabled?: boolean
  excludeCurrentUser?: boolean
  label?: string
  placeholder?: string
}

export function MemberSelect({
  value,
  onChange,
  className,
  creatable = false,
  disabled = false,
  excludeCurrentUser = true,
  label,
  placeholder = 'Membro',
}: MemberSelectProps) {
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const [createOpen, setCreateOpen] = useState(false)
  const { data } = useListUsersByOrg(slug, { query: { enabled: !!slug } })
  const members = excludeCurrentUser
    ? getSplitEligibleOrgUsers(data?.users ?? [], currentUserId)
    : (data?.users ?? [])

  return (
    <div className="space-y-2">
      {(label || creatable) && (
        <div className="flex min-h-6 items-center gap-1.5">
          {label ? <Label className="text-sm text-slate-600">{label}</Label> : null}
          {creatable ? (
            <button
              type="button"
              aria-label="Novo membro"
              className={stackyDrawerAddButton}
              disabled={disabled}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3" />
            </button>
          ) : null}
        </div>
      )}

      <Select
        value={value ?? ''}
        disabled={disabled}
        onValueChange={id => onChange(id || null)}
      >
        <SelectTrigger className={className ?? 'h-8 min-w-[120px]'}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {members.map(member => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {creatable ? (
        <NewUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={userId => onChange(userId)}
        />
      ) : null}
    </div>
  )
}
