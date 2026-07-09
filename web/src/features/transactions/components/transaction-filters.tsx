import { useNavigate, useSearch } from '@tanstack/react-router'
import { CalendarDays, LayoutList, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useListAccounts, useListCategories } from '@/api/generated/api'
import type { ListTransactionsStatus, ListTransactionsType } from '@/api/generated/model'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useTransactionListQueryStore } from '@/stores/transaction-list-query'
import { cn } from '@/lib/utils'

type RecurringFilter = 'all' | 'recurring' | 'single'
type ScheduledFilter = 'scheduled' | 'unscheduled'
type ViewMode = 'list' | 'calendar' | 'statement'

export function TransactionFilters() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    accountId?: string
    categoryId?: string
    status?: ListTransactionsStatus
    type?: ListTransactionsType
    search?: string
    recurring?: RecurringFilter
    scheduled?: ScheduledFilter
    view?: ViewMode
  }

  const resetPage = useTransactionListQueryStore(s => s.resetPage)

  const [searchInput, setSearchInput] = useState(search.search ?? '')

  const { data: accounts } = useListAccounts(slug, { query: { enabled: !!slug } })
  const { data: categories } = useListCategories(slug, { query: { enabled: !!slug } })

  useEffect(() => {
    setSearchInput(search.search ?? '')
  }, [search.search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed === (search.search ?? '')) return
      navigate({
        to: '.',
        search: prev => ({ ...prev, search: trimmed || undefined }),
        replace: true,
      })
      resetPage()
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, search.search, navigate, resetPage])

  const update = (patch: Record<string, string | undefined>) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, ...patch }),
      replace: true,
    })
    resetPage()
  }

  const view = search.view ?? 'list'

  return (
    <div className="mx-4 space-y-3 rounded-lg border border-slate-200/80 bg-white p-4 lg:mx-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="shrink-0 text-[11px] font-semibold tracking-wider text-slate-400">
            FILTROS
          </span>

          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar descrição..."
              className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={search.categoryId ?? 'all'}
              onValueChange={v => update({ categoryId: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categoria</SelectItem>
                {categories?.categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AccountSelect
              accounts={accounts?.accounts ?? []}
              value={search.accountId ?? 'all'}
              onValueChange={v => update({ accountId: v === 'all' ? undefined : v })}
              allOption={{ value: 'all', label: 'Conta' }}
              className="h-9 w-auto min-w-[100px] rounded-lg border-slate-200 text-sm"
            />

            <Select
              value={search.type ?? 'all'}
              onValueChange={v => update({ type: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-auto min-w-[90px] rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tipo</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={search.recurring ?? 'all'}
              onValueChange={v => update({ recurring: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Recorrência</SelectItem>
                <SelectItem value="recurring">Recorrentes</SelectItem>
                <SelectItem value="single">Avulsas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={search.scheduled ?? 'all'}
              onValueChange={v =>
                update({ scheduled: v === 'all' ? undefined : (v as ScheduledFilter) })
              }
            >
              <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Agendamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Agendamento</SelectItem>
                <SelectItem value="scheduled">Agendadas</SelectItem>
                <SelectItem value="unscheduled">Não agendadas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={search.status ?? 'all'}
              onValueChange={v => update({ status: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-auto min-w-[100px] rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex shrink-0 rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              view === 'list'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
            onClick={() => update({ view: undefined })}
          >
            <LayoutList className="size-4" />
            Lista
          </button>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              view === 'calendar'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
            onClick={() => update({ view: 'calendar' })}
          >
            <CalendarDays className="size-4" />
            Calendário
          </button>
        </div>
      </div>
    </div>
  )
}
