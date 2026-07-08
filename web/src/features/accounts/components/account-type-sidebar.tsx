import type { CreateAccountBodyType, ListAccounts200AccountsItem } from '@/api/generated/model'
import { ChevronDown, MoreVertical, Plus, Settings2, Trash2 } from 'lucide-react'
import { useState } from 'react'

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
import {
  ACCOUNT_TYPE_SINGULAR,
  type AccountSidebarSection,
  institutionBrandStyle,
} from '../constants'
import { CardBrandBadge } from './card-brand-badge'

interface AccountTypeSidebarProps {
  sections: AccountSidebarSection<ListAccounts200AccountsItem>[]
  selectedId?: string
  onSelect: (accountId: string) => void
  onCreate: (type: CreateAccountBodyType, institution?: string | null) => void
  onOpenSettings: (account: ListAccounts200AccountsItem) => void
  onDelete: (account: ListAccounts200AccountsItem) => void
}

function AccountSidebarItem({
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
        <p className={cn('mt-1 text-xs', text.muted)}>
          {account.closingDay != null && `Fecha dia ${account.closingDay}`}
          {account.closingDay != null && account.dueDay != null && ' · '}
          {account.dueDay != null && `Vence dia ${account.dueDay}`}
        </p>
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

function InstitutionSection({
  section,
  selectedId,
  onSelect,
  onCreate,
  onOpenSettings,
  onDelete,
}: {
  section: AccountSidebarSection<ListAccounts200AccountsItem>
  selectedId?: string
  onSelect: (accountId: string) => void
  onCreate: (type: CreateAccountBodyType, institution?: string | null) => void
  onOpenSettings: (account: ListAccounts200AccountsItem) => void
  onDelete: (account: ListAccounts200AccountsItem) => void
}) {
  const [open, setOpen] = useState(true)
  const brand = institutionBrandStyle(section.institution)
  const singleCreateOption = section.createOptions.length === 1 ? section.createOptions[0] : null

  return (
    <section className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left lg:px-4"
        onClick={() => setOpen(current => !current)}
      >
        <div className="flex items-center gap-2">
          {section.institution && (
            <span
              className={cn('flex size-5 shrink-0 items-center justify-center rounded-md', brand.bg)}
            >
              <span className={cn('text-[10px] font-bold', brand.text)}>
                {section.label.charAt(0)}
              </span>
            </span>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {section.label}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="space-y-2 px-3 pb-3 lg:px-2">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {section.accounts.map(account => (
              <AccountSidebarItem
                key={account.id}
                account={account}
                selected={account.id === selectedId}
                onSelect={() => onSelect(account.id)}
                onOpenSettings={() => onOpenSettings(account)}
                onDelete={() => onDelete(account)}
              />
            ))}
          </div>

          {singleCreateOption ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start rounded-lg text-slate-500 hover:text-slate-900"
              onClick={() => onCreate(singleCreateOption.type, section.institution)}
            >
              <Plus className="mr-1.5 size-3.5" />
              {singleCreateOption.label}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start rounded-lg text-slate-500 hover:text-slate-900"
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Adicionar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {section.createOptions.map(option => (
                  <DropdownMenuItem
                    key={option.type}
                    onClick={() => onCreate(option.type, section.institution)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </section>
  )
}

export function AccountTypeSidebar({
  sections,
  selectedId,
  onSelect,
  onCreate,
  onOpenSettings,
  onDelete,
}: AccountTypeSidebarProps) {
  return (
    <aside className="flex max-h-[50vh] shrink-0 flex-col border-b border-slate-200 lg:h-full lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
      <div className="hidden shrink-0 px-4 py-2 lg:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Seus cartões
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.map(section => (
          <InstitutionSection
            key={section.key}
            section={section}
            selectedId={selectedId}
            onSelect={onSelect}
            onCreate={onCreate}
            onOpenSettings={onOpenSettings}
            onDelete={onDelete}
          />
        ))}
      </div>
    </aside>
  )
}
