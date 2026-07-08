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
import { ListViewModeToggle, type ListViewMode } from '@/components/list-view-mode-toggle'
import { QuickFilterBadges } from '@/components/quick-filter-badges'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import type {
  InvoiceFilterCounts,
  InvoiceQuickFilter,
  InvoiceStatementFilters,
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
  viewMode: ListViewMode
  showCardFilter: boolean
  cards: Array<{ id: string; label: string; lastFourDigits?: string | null }>
  onChange: (patch: Partial<InvoiceStatementFilters>) => void
  onViewModeChange: (viewMode: ListViewMode) => void
}

export function CreditCardStatementFilters({
  filters,
  counts,
  viewMode,
  showCardFilter,
  cards,
  onChange,
  onViewModeChange,
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
        <QuickFilterBadges
          className="min-w-0 flex-1"
          value={filters.quickFilter}
          options={QUICK_FILTERS.map(filter => ({
            id: filter.id,
            label: filter.label,
            count: filter.count?.(counts),
          }))}
          onChange={quickFilter => onChange({ quickFilter })}
        />
        <ListViewModeToggle
          className="ml-auto shrink-0"
          value={viewMode}
          onChange={onViewModeChange}
        />
      </div>
    </div>
  )
}
