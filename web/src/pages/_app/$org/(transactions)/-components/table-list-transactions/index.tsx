import type { ListTransactions200 } from '@/http/generated/model'
import { Footer } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'
import { DrawerEdit } from './drawer-edit'

interface Props extends ListTransactions200 {}

export function TableLIstTransactions({ transactions }: Props) {
  const { table, editing, setEditing } = useTable(transactions)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable table={table} />
      <TableView table={table} />
      <Footer table={table} />
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
