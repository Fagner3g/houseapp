import { createFileRoute } from '@tanstack/react-router'
import { File, Loader2 } from 'lucide-react'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListTransactions } from '@/http/generated/api'
import { TableLIstTransactions } from './-components/table-list-transactions'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
})

function Transaction() {
  const { slug } = useActiveOrganization()
  const { data: transactions, isPending } = useListTransactions(slug, {
    query: {
      maxPages: 1,
      retry: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
      select: d => d?.transactions ?? [],
    },
  })

  if (isPending) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500">Aguarde um momento...</p>
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }

  if (!transactions?.length) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500 mb-4">Nenhuma despesa cadastrada</p>
        <File className="text-zinc-500 size-20" />
      </div>
    )
  }

  return (
    <div className="mt-4">
      <TableLIstTransactions transactions={transactions} />
    </div>
  )
}
