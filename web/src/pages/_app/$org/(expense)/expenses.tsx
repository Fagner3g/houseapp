import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useCreateExpense, useListExpenses, useListUsersByOrg } from '@/http/generated/api'

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

  const { slug } = useActiveOrganization()
  const { data } = useListExpenses(slug)
  const { data: usersData } = useListUsersByOrg(slug)
  const { mutateAsync: createExpense } = useCreateExpense()

  async function handleSubmit(values: FormValues) {
    await createExpense({
      slug,
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
                  <SelectItem key={user.name} value={user.name} className="rounded-lg">
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
