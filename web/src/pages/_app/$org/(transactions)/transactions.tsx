import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { File, Loader2 } from 'lucide-react'
import z from 'zod'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import { http } from '@/http/client'
import type { ListTransactions200 } from '@/http/generated/model'
import { TableLIstTransactions } from './-components/table-list-transactions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
  validateSearch: z.object({
    tags: z.array(z.string()).optional(),
    type: z.enum(['all', 'income', 'expense']).default('all'),
    dateFrom: z.string().default(startOfMonth),
    dateTo: z.string().default(endOfMonth),
    page: z.coerce.number().int().default(1),
    perPage: z.coerce.number().int().default(10),
  }),
})

function Transaction() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const {
    tags = [],
    type,
    dateFrom,
    dateTo,
    page,
    perPage,
  } = useSearch({ strict: false })

  const { data, isPending } = useQuery({
    enabled: !!slug,
    queryKey: [
      'transactions',
      slug,
      tags.join(','),
      type,
      dateFrom,
      dateTo,
      page,
      perPage,
    ],
    queryFn: async () => {
      const search = new URLSearchParams()
      tags.forEach(tag => search.append('tags', tag))
      search.set('type', type)
      search.set('dateFrom', dateFrom)
      search.set('dateTo', dateTo)
      search.set('page', String(page))
      search.set('perPage', String(perPage))
      const url = `/org/${slug}/transactions?${search.toString()}`
      const res = await http<ListTransactions200>(url, { method: 'GET' })
      return res
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const transactions = data?.transactions ?? []

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
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          value={type}
          onValueChange={value =>
            navigate({
              to: '.',
              search: prev => ({ ...prev, type: value, page: 1 }),
              replace: true,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={e =>
            navigate({
              to: '.',
              search: prev => ({ ...prev, dateFrom: e.target.value, page: 1 }),
              replace: true,
            })
          }
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e =>
            navigate({
              to: '.',
              search: prev => ({ ...prev, dateTo: e.target.value, page: 1 }),
              replace: true,
            })
          }
        />
      </div>

      <TableLIstTransactions
        transactions={transactions}
        pagination={{
          page: data?.page ?? page,
          perPage: data?.perPage ?? perPage,
          totalPages: data?.totalPages ?? 1,
          pagesRemaining: data?.pagesRemaining ?? 0,
        }}
        onPageChange={p =>
          navigate({ to: '.', search: prev => ({ ...prev, page: p }), replace: true })
        }
        onPerPageChange={pp =>
          navigate({
            to: '.',
            search: prev => ({ ...prev, perPage: pp, page: 1 }),
            replace: true,
          })
        }
      />
    </div>
  )
}
