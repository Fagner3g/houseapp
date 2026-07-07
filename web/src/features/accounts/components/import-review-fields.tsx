import { useListUsersByOrg } from '@/api/generated/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategorySelect as CategorySelectBase } from '@/features/categories/components/category-select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { getSplitEligibleOrgUsers } from '@/lib/org-users'
import { useAuthStore } from '@/stores/auth'

import type { SplitMode } from './import-review-types'

export const SPLIT_MODE_LABELS: Record<SplitMode, string> = {
  none: 'Minha despesa',
  half: 'Dividir 50%',
  custom: 'Valor customizado',
  full_other: 'Delegar conta',
}

export function CategorySelect({
  value,
  type,
  onChange,
  className,
  disabled,
}: {
  value: string | null
  type: 'income' | 'expense'
  onChange: (categoryId: string | null) => void
  className?: string
  disabled?: boolean
}) {
  return (
    <CategorySelectBase
      value={value ?? undefined}
      type={type}
      onChange={id => onChange(id || null)}
      className={className ?? 'h-8 min-w-[140px]'}
      placeholder="Categoria"
      enabled={!disabled}
    />
  )
}

export function MemberSelect({
  value,
  onChange,
  className,
}: {
  value: string | null
  onChange: (userId: string | null) => void
  className?: string
}) {
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const { data } = useListUsersByOrg(slug, { query: { enabled: !!slug } })
  const members = getSplitEligibleOrgUsers(data?.users ?? [], currentUserId)

  return (
    <Select value={value ?? ''} onValueChange={id => onChange(id || null)}>
      <SelectTrigger className={className ?? 'h-8 min-w-[120px]'}>
        <SelectValue placeholder="Membro" />
      </SelectTrigger>
      <SelectContent>
        {members.map(member => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
