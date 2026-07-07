import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useListCategories } from '@/api/generated/api'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

import {
  type InvoiceFilterCounts,
  type InvoiceQuickFilter,
  type InvoiceStatementFilters,
} from './credit-card-statement-filter-utils'

const QUICK_FILTERS: Array<{
  id: InvoiceQuickFilter
  label: string
  count?: (counts: InvoiceFilterCounts) => number
}> = [
  { id: 'all', label: 'Todos' },
  { id: 'purchases', label: 'Compras', count: c => c.purchases },
  { id: 'credits', label: 'Créditos', count: c => c.credits },
  { id: 'payments', label: 'Pagamentos', count: c => c.payments },
  { id: 'uncategorized', label: 'Sem categoria', count: c => c.uncategorized },
  { id: 'divided', label: 'Compras divididas', count: c => c.divided },
  { id: 'installments', label: 'Parceladas', count: c => c.installments },
]

type CreditCardStatementFiltersProps = {
  filters: InvoiceStatementFilters
  counts: InvoiceFilterCounts
  showCardFilter: boolean
  cards: Array<{ id: string; label: string; lastFourDigits?: string | null }>
  onChange: (patch: Partial<InvoiceStatementFilters>) => void
}

export function CreditCardStatementFilters({
  filters,
  counts,
  showCardFilter,
  cards,
  onChange,
}: CreditCardStatementFiltersProps) {
  const { slug } = useActiveOrganization()
  const [searchInput, setSearchInput] = useState(filters.search)

  const { data: categoriesData } = useListCategories(slug, { query: { enabled: !!slug } })

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed === filters.search) return
      onChange({ search: trimmed })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search, onChange])

  return (
    <div className="space-y-3 rounded-lg border border-slate-200/80 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
            value={filters.categoryId}
            onValueChange={categoryId => onChange({ categoryId })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-lg border-slate-200 text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categoria</SelectItem>
              {categoriesData?.categories?.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showCardFilter ? (
            <Select value={filters.cardId} onValueChange={cardId => onChange({ cardId })}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartões</SelectItem>
                {cards.map(card => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.label}
                    {card.lastFourDigits ? ` · ${card.lastFourDigits}` : ''}
                  </SelectItem>
                ))}
                <SelectItem value="unassigned">Sem cartão</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map(filter => {
          const count = filter.count?.(counts)
          const isActive = filters.quickFilter === filter.id
          const isDisabled = filter.id !== 'all' && count === 0

          return (
            <button
              key={filter.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange({ quickFilter: filter.id })}
              className={cn(
                'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                isDisabled && 'cursor-not-allowed opacity-40 hover:border-slate-200 hover:bg-white'
              )}
            >
              {filter.label}
              {count != null && filter.id !== 'all' ? (
                <span className={cn('tabular-nums', isActive ? 'text-white/80' : 'text-slate-400')}>
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
