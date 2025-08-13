import type {
  ListTransactions200TransactionsItem,
} from '@/http/generated/model'
import { Footer } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  page: number
  perPage: number
  totalPages: number
  type: 'all' | 'income' | 'expense'
  dateFrom: string
  dateTo: string
  onTypeChange: (t: 'all' | 'income' | 'expense') => void
  onDateFromChange: (d: string) => void
  onDateToChange: (d: string) => void
  onPageChange: (p: number) => void
  onPerPageChange: (p: number) => void
}

export function TableLIstTransactions(props: Props) {
  const {
    transactions,
    page,
    perPage,
    totalPages,
    type,
    dateFrom,
    dateTo,
    onTypeChange,
    onDateFromChange,
    onDateToChange,
    onPageChange,
    onPerPageChange,
  } = props

  const { table } = useTable(transactions, perPage)

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable
        table={table}
        type={type}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onTypeChange={onTypeChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
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
