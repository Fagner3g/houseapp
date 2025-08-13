import type { ListTransactions200 } from '@/http/generated/model'
import { Footer } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props extends ListTransactions200 {}

export function TableLIstTransactions({ transactions }: Props) {
  const { table } = useTable(transactions)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable table={table} />
      <TableView table={table} />
      <Footer table={table} />
    </div>
  )
}
