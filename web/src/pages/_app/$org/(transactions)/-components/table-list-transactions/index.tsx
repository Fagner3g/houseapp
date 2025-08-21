import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { useState } from 'react'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { CalendarTransactions } from '../calendar'
import { DrawerNewTransaction } from '../modal-new-transaction'
import { DrawerEdit } from './drawer-edit'
import type { FilterTableProps } from './filter'
import { Footer, type FooterProps } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props extends FooterProps, FilterTableProps {
  transactions: ListTransactions200['transactions']
}

export function TableLIstTransactions({ transactions, dateFrom, dateTo, ...props }: Props) {
  const [draft, setDraft] = useState<ListTransactions200TransactionsItem | null>(null)
  const [openNew, setOpenNew] = useState(false)

  const navigate = useNavigate()
  const { view = 'table' } = useSearch({ strict: false })

  const { table, editing, setEditing } = useTable(transactions, props.perPage, item => {
    setDraft(item)
    setOpenNew(true)
  })

  return (
    <Tabs
      value={view}
      onValueChange={value =>
        navigate({ to: '.', search: prev => ({ ...prev, view: value }), replace: true })
      }
      className="flex flex-col gap-4"
    >
      <NavbarTable
        table={table}
        view={view}
        onCreate={() => {
          setDraft(null)
          setOpenNew(true)
        }}
        type={props.type}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
      <TabsContent value="table" className="flex flex-col gap-4">
        <TableView table={table} />
        <Footer {...props} />
      </TabsContent>
      <TabsContent
        value="calendar"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <CalendarTransactions
          transactions={transactions}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </TabsContent>
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
    </Tabs>
  )
}
