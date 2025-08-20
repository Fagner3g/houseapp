import type { ListTransactions200 } from '@/api/generated/model'
import { DrawerEdit } from './drawer-edit'
import type { FilterTableProps } from './filter'
import { Footer, type FooterProps } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props extends FooterProps, FilterTableProps {
  transactions: ListTransactions200['transactions']
}

export function TableLIstTransactions({ transactions, ...props }: Props) {
  const { table, editing, setEditing } = useTable(transactions)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable table={table} {...props} />
      <TableView table={table} />
      <Footer {...props} />
      <DrawerEdit
        transaction={editing}
        open={!!editing}
        onOpenChange={open => {
          if (!open) setEditing(null)
        }}
      />
    </div>
  )
}
