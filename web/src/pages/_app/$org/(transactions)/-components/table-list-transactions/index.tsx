import type { ListTransactions200 } from '@/api/generated/model'
import { DrawerEdit } from './drawer-edit'
import { Footer } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props {
  transactions: ListTransactions200['transactions']
}

export function TableLIstTransactions({ transactions }: Props) {
  const { table, editing, setEditing } = useTable(transactions)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable table={table} />
      <TableView table={table} />
      <Footer />
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
