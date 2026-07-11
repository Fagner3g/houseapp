import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

import { personInitials } from './person-initials'

interface SplitMemberChipProps {
  name: string
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function SplitMemberChip({ name, onClick, disabled, className }: SplitMemberChipProps) {
  const firstName = name.split(' ')[0] ?? name

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <Avatar className="size-6">
        <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">
          {personInitials(name)}
        </AvatarFallback>
      </Avatar>
      {firstName}
    </button>
  )
}

interface SplitMemberChipListProps {
  members: { id: string; name: string }[]
  onSelect: (userId: string) => void
  disabled?: boolean
  label?: string
}

export function SplitMemberChipList({
  members,
  onSelect,
  disabled,
  label = 'Delegar para',
}: SplitMemberChipListProps) {
  if (members.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {members.map(member => (
          <SplitMemberChip
            key={member.id}
            name={member.name}
            disabled={disabled}
            onClick={() => onSelect(member.id)}
          />
        ))}
      </div>
    </div>
  )
}
