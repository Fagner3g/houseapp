import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useListExpenses, useCreateExpense, useListUsers } from '@/http/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export const Route = createFileRoute('/_app/$org/(expense)/expenses')({
  component: Expenses,
})

const schema = z.object({
  title: z.string(),
  payToId: z.string(),
  amount: z.string(),
  dueDate: z.string(),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function Expenses() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { orgSlug } = useActiveOrganization()
  const { data } = useListExpenses(orgSlug)
  const { data: usersData } = useListUsers(orgSlug)
  const { mutateAsync: createExpense } = useCreateExpense()

  async function handleSubmit(values: FormValues) {
    await createExpense({
      slug: orgSlug,
      data: {
        ...values,
        amount: Number(values.amount),
      },
    })
    form.reset()
  }

  return (
    <div className="p-4 space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Nova despesa</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <Input placeholder="Título" {...form.register('title')} />
            <Select
              value={form.watch('payToId')}
              onValueChange={value => form.setValue('payToId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pagar para" />
              </SelectTrigger>
              <SelectContent>
                {usersData?.users.map(user => (
                  <SelectItem key={user.id} value={user.id} className="rounded-lg">
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Valor" type="number" {...form.register('amount')} />
            <Input placeholder="Data de vencimento" type="date" {...form.register('dueDate')} />
            <Input placeholder="Descrição" {...form.register('description')} />
            <Button type="submit">Cadastrar</Button>
          </form>
        </DialogContent>
      </Dialog>

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
