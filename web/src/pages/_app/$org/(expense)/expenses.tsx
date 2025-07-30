import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useListExpenses } from '@/http/generated/api'
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
  const { data, isPending } = useListExpenses(orgSlug)

  async function handleSubmit(values: FormValues) {
    console.log(values)
    form.reset()
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4 p-4">
      <Input placeholder="Título" {...form.register('title')} />
      <Select value={form.watch('payToId')} onValueChange={value => form.setValue('payToId', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Pagar para" />
        </SelectTrigger>
        <SelectContent>
          {data?.expenses.map(user => (
            <SelectItem key={user.id} value={user.id} className="rounded-lg">
              {user.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input placeholder="Valor" type="number" {...form.register('amount')} />
      <Input placeholder="Data de vencimento" type="date" {...form.register('dueDate')} />
      <Input placeholder="Descrição" {...form.register('description')} />
      <Button type="submit" disabled={isPending} isLoading={isPending}>
        Cadastrar
      </Button>
    </form>
  )
}
