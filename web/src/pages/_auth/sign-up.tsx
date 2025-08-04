import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateNewUser } from '@/http/generated/api'

export const Route = createFileRoute('/_auth/sign-up')({
  component: Index,
  head: () => ({
    meta: [{ title: 'Sign-in | House App' }],
  }),
})

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  ddd: z.string().min(2).max(2),
  phone: z.string().min(8).max(10),
})

type FormValues = z.infer<typeof schema>

function Index() {
  const navigate = useNavigate()
  const { mutateAsync: createUser } = useCreateNewUser()

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function handleSubmit(values: FormValues) {
    const inviteToken = localStorage.getItem('invite-token') || undefined
    try {
      await createUser({ data: { ...values, inviteToken } })
      toast.success('Cadastro realizado! Verifique seu e-mail.')
      navigate({ to: '/sign-in' })
    } catch {
      toast.error('Erro ao cadastrar')
    }
  }

  return (
    <div className="justify-center items-center text-center flex flex-col">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-3 w-sm">
        <h1>Fazer cadastro</h1>
        <Input placeholder="Nome" {...form.register('name')} />
        <Input placeholder="Email" {...form.register('email')} />
        <Input placeholder="DDD" {...form.register('ddd')} />
        <Input placeholder="Telefone" {...form.register('phone')} />
        <Button type="submit">Cadastrar</Button>
        <Button
          type="button"
          className="mt-5"
          onClick={() => navigate({ to: '/sign-in' })}
          variant="outline"
        >
          Voltar
        </Button>
      </form>
    </div>
  )
}
