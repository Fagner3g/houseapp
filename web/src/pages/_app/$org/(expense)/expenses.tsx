import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

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

export const Route = createFileRoute('/_app/$org/(expense)/expenses')({
  component: Expenses,
})

function Expenses() {
  const [title, setTitle] = useState('')
  const [payToId, setPayToId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  const { data, isPending } = useListExpenses({ organizationId: 'org-1' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setTitle('')
    setPayToId('')
    setAmount('')
    setDueDate('')
    setDescription('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
      <Select value={payToId} onValueChange={setPayToId}>
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
