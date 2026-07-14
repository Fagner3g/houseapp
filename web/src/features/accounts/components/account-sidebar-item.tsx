import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { MoreVertical, Settings2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import {
  accountCardStyle,
  accountCardTextClasses,
  isLightColor,
  primaryCardBrand,
  resolveAccountColor,
  resolveAccountIcon,
} from '../account-appearance'
import { ACCOUNT_TYPE_SINGULAR, institutionLabel } from '../constants'
import { CardBrandBadge } from './card-brand-badge'

export function AccountSidebarItem({
  account,
  selected,
  onSelect,
  onOpenSettings,
  onDelete,
}: {
  account: ListAccounts200AccountsItem
  selected: boolean
  onSelect: () => void
  onOpenSettings: () => void
  onDelete: () => void
}) {
  const isCredit = account.type === 'credit_card'
  const typeLabel = ACCOUNT_TYPE_SINGULAR[account.type] ?? account.type
  const color = resolveAccountColor(account)
  const Icon = resolveAccountIcon(account)
  const brand = primaryCardBrand(account)
  const text = accountCardTextClasses(color, selected)
  const lightBackground = isLightColor(color)

  const subtitle = isCredit
    ? [
        account.closingDay != null ? `Fecha dia ${account.closingDay}` : null,
        account.dueDay != null ? `Vence dia ${account.dueDay}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : institutionLabel(account.institution)

  return (
    <div
      className={cn(
        'group relative min-w-[200px] shrink-0 rounded-lg border transition-all lg:min-w-0 lg:w-full',
        selected
          ? 'hover:brightness-95'
          : 'bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
      )}
      style={accountCardStyle(account, selected)}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full cursor-pointer p-3 pr-10 text-left"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md',
              selected
                ? lightBackground
                  ? 'bg-black/5 text-slate-900'
                  : 'bg-white/15 text-white'
                : 'text-white'
            )}
            style={selected ? undefined : { backgroundColor: color }}
          >
            <Icon className="size-4" />
          </div>
          {isCredit && brand && (
            <CardBrandBadge brand={brand} compact className="shrink-0" />
          )}
        </div>

        <p className={cn('text-xs font-medium', text.muted)}>{typeLabel}</p>
        <p className={cn('mt-0.5 truncate font-semibold', text.title)}>{account.name}</p>
        {subtitle ? <p className={cn('mt-1 text-xs', text.muted)}>{subtitle}</p> : null}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-1.5 top-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100',
              text.menu
            )}
            aria-label={`Ações de ${account.name}`}
            onClick={event => event.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onOpenSettings}>
            <Settings2 className="size-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
