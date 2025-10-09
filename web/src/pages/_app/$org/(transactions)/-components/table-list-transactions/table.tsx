import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { flexRender, type Table as ReactTable } from '@tanstack/react-table'
import { useId } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  page: number
  perPage: number
  totalPages: number
  onPerPageChange: (perPage: number) => void
  onPageChange: (page: number) => void
}

export function TableView({
  table,
  isMobile = false,
  page,
  perPage,
  totalPages,
  onPerPageChange,
  onPageChange,
}: TableProps) {
  const transactions = table.getRowModel().rows.map(row => row.original)
  const selectedRows = table.getSelectedRowModel().rows.map(row => row.id)
  const selectId = useId()

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
    <div className="relative flex flex-col flex-1 overflow-hidden">
      <div className="rounded-xl border border-border/50 shadow-sm mx-4 lg:mx-6 mt-2 flex flex-col">
        <div className="overflow-visible">
          <Table className="mb-0">
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
            <TableBody className="**:data-[slot=table-cell]:first:w-8 [&>tr:last-child]:border-b-0">
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

        {/* Rodapé da tabela com paginação */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-1 border-t border-border/50 bg-muted/30 flex-shrink-0">
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="items-center gap-2 lg:flex">
              <Select
                value={`${perPage}`}
                onValueChange={value => {
                  onPerPageChange(Number(value))
                }}
              >
                <SelectTrigger className="w-20" id={selectId}>
                  <SelectValue placeholder={perPage} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map(pageSize => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {page} de {totalPages}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => onPageChange(1)}
                disabled={page === 1}
              >
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => onPageChange(totalPages)}
                disabled={page === totalPages}
              >
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
