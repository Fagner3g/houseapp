import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { http } from '@/http/client'

interface User {
  id: string
  name: string
}

async function fetchUsers() {
  return http<{ users: User[] }>('/users', { method: 'GET' })
}

interface ExpenseRequest {
  title: string
  payToId: string
  amount: number
  dueDate: string
  description?: string
}

async function createExpense(data: ExpenseRequest) {
  return http('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const Route = createFileRoute('/_app/(expense)/expenses')({
  component: Expenses,
})

function Expenses() {
  const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { mutateAsync, isPending } = useMutation({ mutationFn: createExpense })

  const [title, setTitle] = useState('')
  const [payToId, setPayToId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await mutateAsync({
      title,
      payToId,
      amount: Number(amount),
      dueDate,
      description: description || undefined,
    })

    setTitle('')
    setPayToId('')
    setAmount('')
    setDueDate('')
    setDescription('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <Input
        placeholder="Título"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <Select value={payToId} onValueChange={setPayToId}>
        <SelectTrigger>
          <SelectValue placeholder="Pagar para" />
        </SelectTrigger>
        <SelectContent>
          {data?.users.map(user => (
            <SelectItem key={user.id} value={user.id} className="rounded-lg">
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Valor"
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <Input
        placeholder="Data de vencimento"
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
      />
      <Input
        placeholder="Descrição"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Button type="submit" disabled={isPending} isLoading={isPending}>
        Cadastrar
      </Button>
    </form>
  )
}
