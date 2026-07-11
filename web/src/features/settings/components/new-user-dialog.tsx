import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useHookFormMask } from 'use-mask-input'
import type z from 'zod'

import {
  getListUsersByOrgQueryKey,
  listUsersByOrg,
  useCreateUserWithInvite,
} from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { readHttpErrorMessage } from '@/lib/http'
import { schemaSignUp } from '@/pages/_auth/sign-up'

type FormValues = z.infer<typeof schemaSignUp>

interface NewUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (userId: string) => void
}

export function NewUserDialog({ open, onOpenChange, onCreated }: NewUserDialogProps) {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()
  const form = useForm<FormValues>({ resolver: zodResolver(schemaSignUp) })
  const registerWithMask = useHookFormMask(form.register)
  const { mutateAsync: createUser, isPending } = useCreateUserWithInvite()

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset({ phone: '' })
    }
    onOpenChange(next)
  }

  async function handleSubmit(data: FormValues) {
    if (!slug) return

    try {
      await createUser({ data, slug })
      const refreshed = await queryClient.fetchQuery({
        queryKey: getListUsersByOrgQueryKey(slug),
        queryFn: () => listUsersByOrg(slug),
      })
      const created = refreshed.users.find(
        user => user.email.toLowerCase() === data.email.toLowerCase()
      )

      toast.success('Convite enviado!')
      form.reset({ phone: '' })
      handleOpenChange(false)
      if (created) {
        onCreated?.(created.id)
      }
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao criar usuário'))
    }
  }

  const handleTrySubmit = () => {
    for (const [field, value] of Object.entries(form.formState.errors)) {
      if (value?.message) {
        toast.error(value.message as string, { id: field })
        break
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
          <DialogDescription>
            Novo usuário — enviaremos um e-mail para concluir o cadastro.
          </DialogDescription>
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
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
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
