import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { File, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListTransactions } from '@/http/generated/api'
import { TableLIstTransactions } from './-components/table-list-transactions'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
})

function Transaction() {
  const { slug } = useActiveOrganization()
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [dateFrom, setDateFrom] = useState(
    dayjs().startOf('month').format('YYYY-MM-DD'),
  )
  const [dateTo, setDateTo] = useState(
    dayjs().endOf('month').format('YYYY-MM-DD'),
  )
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const { data, isPending } = useListTransactions(
    slug,
    {
      type,
      dateFrom,
      dateTo,
      page,
      perPage,
    },
    {
      query: {
        maxPages: 1,
        retry: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: true,
      },
    },
  )

  if (isPending) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500">Aguarde um momento...</p>
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }

  if (!data?.transactions?.length) {
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
        transactions={data.transactions}
        page={data.page}
        perPage={data.perPage}
        totalPages={data.totalPages}
        type={type}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onTypeChange={t => {
          setType(t)
          setPage(1)
        }}
        onDateFromChange={d => {
          setDateFrom(d)
          setPage(1)
        }}
        onDateToChange={d => {
          setDateTo(d)
          setPage(1)
        }}
        onPageChange={p => setPage(p)}
        onPerPageChange={p => {
          setPerPage(p)
          setPage(1)
        }}
      />
    </div>
  )
}
