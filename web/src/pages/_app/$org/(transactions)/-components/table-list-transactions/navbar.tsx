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
}

export function NavbarTable({ table }: Props) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <Select defaultValue="all">
        <SelectTrigger className="flex w-fit @4xl/main:hidden" id="view-selector">
          <SelectValue placeholder="View" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="expenses">Despesas</SelectItem>
          <SelectItem value="incomes">Receitas</SelectItem>
        </SelectContent>
      </Select>

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
