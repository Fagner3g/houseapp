import type { CreateAccountBodyType, ListAccounts200AccountsItem } from '@/api/generated/model'
import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import { type AccountSidebarSection, institutionBrandStyle } from '../constants'
import { AccountSidebarItem } from './account-sidebar-item'

export function InstitutionSection({
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
