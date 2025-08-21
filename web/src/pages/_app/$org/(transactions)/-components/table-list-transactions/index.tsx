import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { useState } from 'react'
import { DrawerEdit } from './drawer-edit'
import type { FilterTableProps } from './filter'
import { Footer, type FooterProps } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'
import { DrawerNewTransaction } from '../modal-new-transaction'

interface Props extends FooterProps, FilterTableProps {
  transactions: ListTransactions200['transactions']
}

export function TableLIstTransactions({ transactions, dateFrom, dateTo, ...props }: Props) {
  const [draft, setDraft] = useState<ListTransactions200TransactionsItem | null>(null)
  const [openNew, setOpenNew] = useState(false)

  const { table, editing, setEditing } = useTable(transactions, props.perPage, item => {
    setDraft(item)
    setOpenNew(true)
  })

  const from = dayjs(dateFrom)
  const to = dayjs(dateTo)
  const isMonthRange =
    from.isValid() &&
    to.isValid() &&
    from.isSame(to, 'month') &&
    from.date() === 1 &&
    to.date() === to.daysInMonth()
  const rangeLabel = isMonthRange
    ? from.locale('pt-br').format('MMMM [de] YYYY')
    : from.isValid() && to.isValid()
      ? `${from.locale('pt-br').format('DD/MM/YYYY')} - ${to.locale('pt-br').format('DD/MM/YYYY')}`
      : ''

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable
        table={table}
        onCreate={() => {
          setDraft(null)
          setOpenNew(true)
        }}
        type={props.type}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
      {rangeLabel && (
        <div className="px-4 lg:px-6">
          <span className="text-sm text-muted-foreground capitalize">
            {rangeLabel}
          </span>
        </div>
      )}
      <TableView table={table} />
      <Footer {...props} />
      <DrawerNewTransaction
        open={openNew}
        onOpenChange={open => {
          setOpenNew(open)
          if (!open) setDraft(null)
        }}
        transaction={draft}
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
