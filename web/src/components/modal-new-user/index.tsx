import { zodResolver } from '@hookform/resolvers/zod'
import { DialogClose } from '@radix-ui/react-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useHookFormMask } from 'use-mask-input'
import type z from 'zod'

import { getListUsersByOrgQueryKey, useCreateUserWithInvite } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { schemaSignUp } from '@/pages/_auth/sign-up'

export type FormValues = z.infer<typeof schemaSignUp>

export function ModalNewUser() {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<FormValues>({ resolver: zodResolver(schemaSignUp) })
  const registerWithMask = useHookFormMask(form.register)
  const { mutateAsync: createUser, isPending } = useCreateUserWithInvite()

  async function handleSubmit(data: FormValues) {
    await createUser({ data, slug })
    toast.success('Convite enviado!')
    await queryClient.invalidateQueries({ queryKey: getListUsersByOrgQueryKey(slug) })
    form.reset({ phone: '' })

    setIsOpen(false)
  }

  const handleTrySubmit = () => {
    const errors = form.formState.errors
    for (const [field, value] of Object.entries(errors)) {
      if (value?.message) {
        toast.error(value.message as string, { id: field })
        break
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
          <DialogDescription>Novo usuário, enviaremos um e-mail para o cadastro.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome completo" value={field.value || ''} />
                  </FormControl>
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
                    <Input placeholder="E-mail" {...field} value={field.value || ''} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      {...registerWithMask('phone', ['(99) 99999-9999', '(99) 9999-9999'], {
                        required: true,
                      })}
                      value={field.value || ''}
                      placeholder="Telefone"
                      type="tel"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleTrySubmit} type="submit" isLoading={isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
