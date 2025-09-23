import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { flexRender, type Table as ReactTable } from '@tanstack/react-table'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MobileCards } from './mobile-cards'
import { TabRowView } from './row'

interface TableProps {
  table: ReactTable<ListTransactions200TransactionsItem>
  isMobile?: boolean
}

export function TableView({ table, isMobile = false }: TableProps) {
  const transactions = table.getRowModel().rows.map(row => row.original)
  const selectedRows = table.getSelectedRowModel().rows.map(row => row.id)

  const handleRowSelect = (id: string, selected: boolean) => {
    const row = table.getRowModel().rows.find(r => r.id === id)
    if (row) {
      row.toggleSelected(selected)
    }
  }

  const handleEdit = (transaction: ListTransactions200TransactionsItem) => {
    table.options.meta?.editRow?.(transaction)
  }

  const handleDuplicate = (transaction: ListTransactions200TransactionsItem) => {
    table.options.meta?.duplicateRow?.(transaction)
  }

  const handlePay = (id: string) => {
    table.options.meta?.payRows?.([id])
  }

  const handleDelete = (id: string) => {
    table.options.meta?.deleteRows?.([id])
  }

  if (isMobile) {
    return (
      <MobileCards
        transactions={transactions}
        onRowSelect={handleRowSelect}
        selectedRows={selectedRows}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onPay={handlePay}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-auto">
      <div className="overflow-hidden rounded-xl border border-border/50 shadow-sm mx-6 lg:mx-8">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-muted/50">
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="h-12 text-sm font-semibold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="**:data-[slot=table-cell]:first:w-8">
            {table.getRowModel().rows?.length ? (
              <SortableContext
                items={table.getRowModel().rows}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map(row => (
                  <TabRowView key={row.id} row={row} />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="text-sm font-medium">Nenhuma transação encontrada</p>
                    <p className="text-xs">
                      Tente ajustar os filtros ou adicionar uma nova transação
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
