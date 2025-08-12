import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { File, Loader2 } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListTransactions } from '@/http/generated/api'
import { ModalNewTransaction } from './-components/modal-new-transaction'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
})

function Transaction() {
  const { slug } = useActiveOrganization()
  const { data, isPending } = useListTransactions(slug, {
    query: {
      maxPages: 1,
      retry: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
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

  if (!data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500 mb-4">Nenhuma despesa cadastrada</p>
        <File className="text-zinc-500 size-20" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <ModalNewTransaction />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.transactions.map(exp => (
            <TableRow key={exp.id}>
              <TableCell>{exp.title}</TableCell>
              <TableCell>{exp.amount}</TableCell>
              <TableCell>{dayjs(exp.dueDate).format('DD/MM/YYYY')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
