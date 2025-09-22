import { IconLayoutColumns, IconPlus, IconSearch, IconX } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import type { Table } from '@tanstack/react-table'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteSelected } from './delete-selected'
import FilterTable, { type FilterTableProps } from './filter'
import { PaySelected } from './pay-selected'

interface Props extends FilterTableProps {
  table: Table<ListTransactions200TransactionsItem>
  onCreate: () => void
  view: 'table' | 'calendar'
  globalFilter: string
  setGlobalFilter: (value: string) => void
}

export function NavbarTable({
  table,
  onCreate,
  view,
  globalFilter,
  setGlobalFilter,
  ...props
}: Props) {
  const navigate = useNavigate()
  const selected = table.getSelectedRowModel().rows.length

  const defaultFrom = dayjs().startOf('month').format('YYYY-MM-DD')
  const defaultTo = dayjs().endOf('month').format('YYYY-MM-DD')
  const hasFilters =
    props.type !== 'all' || props.dateFrom !== defaultFrom || props.dateTo !== defaultTo

  const from = dayjs(props.dateFrom)
  const to = dayjs(props.dateTo)
  const isMonthRange =
    from.isValid() &&
    to.isValid() &&
    from.isSame(to, 'month') &&
    from.date() === 1 &&
    to.date() === to.daysInMonth()
  const rangeLabel = isMonthRange
    ? from.locale('pt-br').format('MMMM [de] YYYY')
    : from.isValid() && to.isValid()
      ? `${from.locale('pt-br').format('DD/MM/YYYY')} - ${to.locale('pt-br').format('DD/MM/YYYY')}`
      : ''

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      {/* Primeira linha: Filtros e botão adicionar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FilterTable {...props} />
          {hasFilters && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear filters"
              onClick={() => {
                navigate({
                  to: '.',
                  search: prev => ({
                    ...prev,
                    type: 'all',
                    dateFrom: defaultFrom,
                    dateTo: defaultTo,
                    page: 1,
                  }),
                  replace: true,
                })
              }}
            >
              <IconX size={16} />
            </Button>
          )}
          {rangeLabel && (
            <span className="hidden truncate text-sm text-muted-foreground capitalize sm:inline">
              {rangeLabel}
            </span>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={onCreate}>
          <IconPlus />
          <span className="hidden lg:inline">Adicionar transação</span>
        </Button>
      </div>

      {/* Segunda linha: Pesquisa, visualização e colunas */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Campo de pesquisa - ocupa toda a largura em mobile */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome da transação..."
            value={globalFilter ?? ''}
            onChange={event => setGlobalFilter(String(event.target.value))}
            className="pl-8 w-full sm:w-64"
          />
        </div>

        {/* Controles de visualização */}
        <div className="flex items-center gap-2">
          <TabsList>
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
          </TabsList>

          {view === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter(column => typeof column.accessorFn !== 'undefined' && column.getCanHide())
                  .map(column => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={value => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Terceira linha: Ações em lote (quando há seleção) */}
      {selected > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PaySelected table={table} />
          <DeleteSelected table={table} />
        </div>
      )}
    </div>
  )
}
