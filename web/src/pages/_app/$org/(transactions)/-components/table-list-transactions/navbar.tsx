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
    <div className="flex flex-col gap-4 px-6 lg:px-8">
      {/* Header compacto */}
      {selected > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{selected}</span>
            </div>
            <span className="text-sm font-medium">
              {selected} selecionada{selected > 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetRowSelection()}
              className="h-6 px-2 text-xs hover:bg-muted/80"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* Filtros e pesquisa */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <FilterTable {...props} />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
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
              className="gap-1 h-7 px-2 text-xs hover:bg-muted/80"
            >
              <IconX size={12} />
              <span>Limpar</span>
            </Button>
          )}
          {rangeLabel && (
            <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-full capitalize">
              {rangeLabel}
            </span>
          )}
        </div>

        {/* Campo de pesquisa, botão de colunas e botão adicionar */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar transações..."
              value={globalFilter ?? ''}
              onChange={event => setGlobalFilter(String(event.target.value))}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Botão de colunas (apenas na visualização de tabela e desktop) */}
          {view === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9 px-3 hidden sm:flex">
                  <IconLayoutColumns size={14} />
                  <span className="text-sm">Colunas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Colunas visíveis
                  </div>
                  {table
                    .getAllColumns()
                    .filter(
                      column => typeof column.accessorFn !== 'undefined' && column.getCanHide()
                    )
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
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Botão Adicionar */}
          <Button onClick={onCreate} className="gap-2 h-9 px-4 bg-primary hover:bg-primary/90">
            <IconPlus size={16} />
            <span className="text-sm font-medium">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Controles de visualização */}
      <div className="flex items-center justify-center lg:justify-start">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto h-9">
          <TabsTrigger value="table" className="text-sm">
            Tabela
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-sm">
            Calendário
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Ações em lote (quando há seleção) */}
      {selected > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-muted-foreground">
              Ações para {selected} transação{selected > 1 ? 'ões' : ''}:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PaySelected table={table} />
            <DeleteSelected table={table} />
          </div>
        </div>
      )}
    </div>
  )
}
