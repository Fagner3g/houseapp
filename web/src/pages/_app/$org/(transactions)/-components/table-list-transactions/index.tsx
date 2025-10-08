import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { DrawerTransaction } from '../../../../../../components/drawer-transaction'
import { CalendarTransactions } from '../calendar'
import { MobileGroupedCards } from './mobile-grouped-cards'
import type { FilterTableProps } from './filter'
import { Footer, type FooterProps } from './footer'
import { useTable } from './hook/use-table'
import { NavbarTable } from './navbar'
import { TableView } from './table'

interface Props extends FooterProps, FilterTableProps {
  transactions: ListTransactions200['transactions']
}

export function TableLIstTransactions({ transactions, dateFrom, dateTo, ...props }: Props) {
  const [currentTransaction, setCurrentTransaction] =
    useState<ListTransactions200TransactionsItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navigate = useNavigate()
  const { view = 'table' } = useSearch({ strict: false })

  const { table, editing, setEditing, globalFilter, setGlobalFilter, isMobile } = useTable(
    transactions,
    props.perPage,
    item => {
      setCurrentTransaction(item)
      setDrawerOpen(true)
    }
  )

  const selectedRows = table.getSelectedRowModel().rows.map(row => row.id)

  const handleRowSelect = (id: string, selected: boolean) => {
    const row = table.getRowModel().rows.find(r => r.id === id)
    if (row) {
      row.toggleSelected(selected)
    }
  }

  return (
    <Tabs
      value={view}
      onValueChange={value =>
        navigate({
          to: '.',
          search: prev => ({ ...prev, view: value as 'table' | 'calendar' | 'payto' }),
          replace: true,
        })
      }
      className="flex flex-col min-h-screen bg-background"
    >
      <NavbarTable
        table={table}
        view={view}
        onCreate={() => {
          setCurrentTransaction(null)
          setDrawerOpen(true)
        }}
        type={props.type}
        dateFrom={dateFrom}
        dateTo={dateTo}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
      <TabsContent value="payto" className="relative flex flex-col flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <MobileGroupedCards
            transactions={transactions}
            onTransactionClick={transaction => {
              setCurrentTransaction(transaction)
              setDrawerOpen(true)
            }}
            onRowSelect={handleRowSelect}
            selectedRows={selectedRows}
          />
        </div>
      </TabsContent>
      <TabsContent value="table" className="flex flex-col flex-1">
        <div className="flex flex-col flex-1">
          <TableView table={table} isMobile={isMobile} />
          <Footer {...props} />
        </div>
      </TabsContent>
      <TabsContent value="calendar" className="relative flex flex-col flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <CalendarTransactions
            transactions={transactions}
            dateFrom={dateFrom || ''}
            dateTo={dateTo || ''}
          />
        </div>
      </TabsContent>
      {(editing || currentTransaction !== undefined) && (
        <DrawerTransaction
          transaction={editing || currentTransaction}
          open={drawerOpen || !!editing}
          onOpenChange={open => {
            if (!open) {
              setDrawerOpen(false)
              setCurrentTransaction(null)
              setEditing(null)
            }
          }}
        />
      )}
    </Tabs>
  )
}
