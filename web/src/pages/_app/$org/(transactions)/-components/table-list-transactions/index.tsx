import type {
  ListTransactions200,
  ListTransactionsType,
} from '@/http/generated/model'
import { Footer } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props extends ListTransactions200 {
  type: ListTransactionsType
  dateFrom: string
  dateTo: string
  onTypeChange: (type: ListTransactionsType) => void
  onDateChange: (from: string, to: string) => void
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function TableLIstTransactions({
  transactions,
  page,
  perPage,
  totalPages,
  type,
  dateFrom,
  dateTo,
  onTypeChange,
  onDateChange,
  onPageChange,
  onPerPageChange,
}: Props) {
  const { table } = useTable(transactions, perPage)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable
        table={table}
        type={type}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onTypeChange={onTypeChange}
        onDateChange={onDateChange}
      />
      <TableView table={table} />
      <Footer
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </div>
  )
}
