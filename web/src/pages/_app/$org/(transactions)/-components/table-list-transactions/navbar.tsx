import { IconLayoutColumns } from '@tabler/icons-react'
import type { Table } from '@tanstack/react-table'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ModalNewTransaction } from '../modal-new-transaction'
import { DeleteSelected } from './delete-selected'
import FilterTable, { type FilterTableProps } from './filter'
import { PaySelected } from './pay-selected'

interface Props extends FilterTableProps {
  table: Table<ListTransactions200TransactionsItem>
}

export function NavbarTable({ table, ...props }: Props) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <FilterTable {...props} />

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
        <PaySelected table={table} />
        <DeleteSelected table={table} />
        <ModalNewTransaction />
      </div>
    </div>
  )
}
