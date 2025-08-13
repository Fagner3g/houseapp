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
import type { ListTransactions200TransactionsItem } from '@/http/generated/model'
import { ModalNewTransaction } from '../modal-new-transaction'

interface Props {
  table: Table<ListTransactions200TransactionsItem>
  type: 'all' | 'income' | 'expense'
  dateFrom: string
  dateTo: string
  onTypeChange: (t: 'all' | 'income' | 'expense') => void
  onDateFromChange: (d: string) => void
  onDateToChange: (d: string) => void
}

export function NavbarTable({
  table,
  type,
  dateFrom,
  dateTo,
  onTypeChange,
  onDateFromChange,
  onDateToChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" id="view-selector">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
        <span>-</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateToChange(e.target.value)}
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
