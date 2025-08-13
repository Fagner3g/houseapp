import { IconLayoutColumns } from '@tabler/icons-react'
import type { Table } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  ListTransactions200TransactionsItem,
  ListTransactionsType,
} from '@/http/generated/model'
import { ModalNewTransaction } from '../modal-new-transaction'

interface Props {
  table: Table<ListTransactions200TransactionsItem>
  type: ListTransactionsType
  dateFrom: string
  dateTo: string
  onTypeChange: (type: ListTransactionsType) => void
  onDateChange: (from: string, to: string) => void
}

export function NavbarTable({
  table,
  type,
  dateFrom,
  dateTo,
  onTypeChange,
  onDateChange,
}: Props) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Select value={type} onValueChange={v => onTypeChange(v as ListTransactionsType)}>
          <SelectTrigger className="flex w-fit" id="type-selector">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateChange(e.target.value, dateTo)}
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateChange(dateFrom, e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
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
        <ModalNewTransaction />
      </div>
    </div>
  )
}
