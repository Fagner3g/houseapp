import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListExpenses } from '@/http/generated/api'
import { ModalNewExpense } from './-components/modal-new-expense'

export const Route = createFileRoute('/_app/$org/(expense)/expenses')({
  component: Expenses,
})

function Expenses() {
  const { slug } = useActiveOrganization()
  const { data } = useListExpenses(slug)

  return (
    <div className="p-4 space-y-4">
      <ModalNewExpense />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.expenses.map(exp => (
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
