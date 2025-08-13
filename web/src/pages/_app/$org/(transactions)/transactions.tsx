import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { File, Loader2 } from 'lucide-react'
import z from 'zod'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import { http } from '@/http/client'
import type { ListTransactions200 } from '@/http/generated/model'
import { TableLIstTransactions } from './-components/table-list-transactions'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
  validateSearch: z.object({
    tags: z.array(z.string()).optional(),
  }),
})

function Transaction() {
  const { slug } = useActiveOrganization()
  const { tags = [] } = useSearch({ strict: false })

  const { data: transactions = [], isPending } = useQuery({
    enabled: !!slug,
    queryKey: ['transactions', slug, tags.join(',')],
    queryFn: async () => {
      const search = new URLSearchParams()
      tags.forEach(tag => search.append('tags', tag))
      const query = search.toString()
      const url = `/org/${slug}/transactions${query ? `?${query}` : ''}`
      const data = await http<ListTransactions200>(url, { method: 'GET' })
      return data.transactions ?? []
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
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
