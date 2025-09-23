import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useHookFormMask } from 'use-mask-input'
import { z } from 'zod'

import { useSignUp } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_auth/sign-up')({
  component: Index,
  head: () => ({
    meta: [{ title: 'Sign-in | House App' }],
  }),
})

export const schemaSignUp = z.object({
  name: z.string('O nome é obrigatório').min(1).max(50),
  email: z.email('E-mail inválido'),
  phone: z
    .string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, {
      error: 'Informe um telefone válido com DDD',
    }),
})

type FormValues = z.infer<typeof schemaSignUp>

function Index() {
  const navigate = useNavigate()
  const { mutateAsync: createUser } = useSignUp()
  const form = useForm<FormValues>({ resolver: zodResolver(schemaSignUp) })
  const registerWithMask = useHookFormMask(form.register)

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
    <div className="min-h-svh grid place-items-center bg-gradient-to-br from-muted to-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Preencha seus dados para começar</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="voce@empresa.com" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      {...registerWithMask('phone', ['(99) 99999-9999', '(99) 9999-9999'], {
                        required: true,
                      })}
                      value={field.value || ''}
                      placeholder="(11) 99999-9999"
                      type="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-1">
              Cadastrar
            </Button>
            <Button
              type="button"
              className="mt-1"
              onClick={() => navigate({ to: '/sign-in' })}
              variant="ghost"
            >
              Já tenho conta
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
