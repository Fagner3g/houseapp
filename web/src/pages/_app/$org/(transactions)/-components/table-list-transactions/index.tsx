import type { ListTransactions200 } from '@/http/generated/model'
import { Footer } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'
import { DrawerEdit } from './drawer-edit'

interface Props {
  transactions: ListTransactions200['transactions']
  pagination: Pick<
    ListTransactions200,
    'page' | 'perPage' | 'totalPages' | 'pagesRemaining'
  >
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function TableLIstTransactions({
  transactions,
  pagination,
  onPageChange,
  onPerPageChange,
}: Props) {
  const { table, editing, setEditing } = useTable(transactions)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable table={table} />
      <TableView table={table} />
      <Footer
        pagination={pagination}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
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
