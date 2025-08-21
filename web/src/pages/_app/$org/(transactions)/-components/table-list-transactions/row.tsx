import { flexRender, type Row } from '@tanstack/react-table'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { TableCell, TableRow } from '@/components/ui/table'

interface RowProps {
  row: Row<ListTransactions200TransactionsItem>
}

export function TabRowView({ row }: RowProps) {
  return (
    <TableRow>
      {row.getVisibleCells().map(cell => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}
