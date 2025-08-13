import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { File, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  useListTransactions,
  type ListTransactionsParams,
  type ListTransactionsType,
} from '@/http/generated/api'
import { TableLIstTransactions } from './-components/table-list-transactions'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
})

function Transaction() {
  const { slug } = useActiveOrganization()

  const [type, setType] = useState<ListTransactionsType>('all')
  const [dateFrom, setDateFrom] = useState(
    dayjs().startOf('month').format('YYYY-MM-DD'),
  )
  const [dateTo, setDateTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const params: ListTransactionsParams = {
    type,
    dateFrom,
    dateTo,
    page,
    perPage,
  }

  const { data, isPending } = useListTransactions(slug, params, {
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  })

  const transactions = data?.transactions ?? []

  function handleTypeChange(t: ListTransactionsType) {
    setType(t)
    setPage(1)
  }

  function handleDateChange(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    setPage(1)
  }

  function handlePerPageChange(p: number) {
    setPerPage(p)
    setPage(1)
  }

  function handlePageChange(p: number) {
    setPage(p)
  }

  if (isPending) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500">Aguarde um momento...</p>
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500 mb-4">Nenhuma despesa cadastrada</p>
        <File className="text-zinc-500 size-20" />
      </div>
    )
  }

  return (
    <div className="mt-4">
      <TableLIstTransactions
        transactions={transactions}
        page={data?.page ?? page}
        perPage={data?.perPage ?? perPage}
        totalPages={data?.totalPages ?? 1}
        type={type}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onTypeChange={handleTypeChange}
        onDateChange={handleDateChange}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
      />
    </div>
  )
}
