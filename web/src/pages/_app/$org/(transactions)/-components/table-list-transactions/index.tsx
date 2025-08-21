import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
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

export function TableLIstTransactions({ transactions, ...props }: Props) {
  const [draft, setDraft] = useState<ListTransactions200TransactionsItem | null>(null)
  const [openNew, setOpenNew] = useState(false)

  const { table, editing, setEditing } = useTable(transactions, props.perPage, item => {
    setDraft(item)
    setOpenNew(true)
  })

  return (
    <div className="flex flex-col gap-4">
      <NavbarTable
        table={table}
        onCreate={() => {
          setDraft(null)
          setOpenNew(true)
        }}
        {...props}
      />
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
