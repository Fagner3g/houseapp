import { useNavigate, useSearch } from '@tanstack/react-router'
import { Filter, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useListAccounts, useListCategories } from '@/api/generated/api'
import type { ListTransactionsType } from '@/api/generated/model'
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

interface TransactionOverdueFiltersProps {
  onFilterChange?: () => void
}

export function TransactionOverdueFilters({ onFilterChange }: TransactionOverdueFiltersProps) {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    accountId?: string
    categoryId?: string
    type?: ListTransactionsType
    search?: string
  }

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
      onFilterChange?.()
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, search.search, navigate, onFilterChange])

  const update = (patch: Record<string, string | undefined>) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, ...patch }),
      replace: true,
    })
    onFilterChange?.()
  }

  return (
    <div className="mx-4 flex flex-col gap-3 rounded-lg border border-slate-200/80 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center lg:mx-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-slate-400">
        <Filter className="size-3.5" />
        FILTROS
      </div>

      <Select
        value={search.type ?? 'all'}
        onValueChange={v => update({ type: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 text-sm sm:w-auto sm:min-w-[100px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tipo</SelectItem>
          <SelectItem value="expense">Despesa</SelectItem>
          <SelectItem value="income">Receita</SelectItem>
          <SelectItem value="transfer">Transferência</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Buscar..."
          className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
        />
      </div>

      <Select
        value={search.categoryId ?? 'all'}
        onValueChange={v => update({ categoryId: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 text-sm sm:w-auto sm:min-w-[120px]">
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
        className="h-9 w-full rounded-lg border-slate-200 text-sm sm:w-auto sm:min-w-[100px]"
      />
    </div>
  )
}
