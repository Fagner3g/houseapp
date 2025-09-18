import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'
import type z from 'zod'

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
import { schemaSignUp } from '@/pages/_auth/sign-up'

export type EditableUser = {
  name: string
  email: string
  phone?: string | null
}

interface ModalEditUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: EditableUser | null
  onSubmit: (data: EditableUser) => void
  isSubmitting?: boolean
}

export function ModalEditUser({
  open,
  onOpenChange,
  user,
  onSubmit,
  isSubmitting,
}: ModalEditUserProps) {
  type FormValues = z.infer<typeof schemaSignUp>
  const form = useForm<FormValues>({ resolver: zodResolver(schemaSignUp) })
  const registerWithMask = useHookFormMask(form.register)

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
      })
    } else {
      form.reset({ name: '', email: '', phone: '' })
    }
  }, [user, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Atualize os dados do usuário selecionado.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(values => {
              onSubmit({ name: values.name, email: values.email, phone: values.phone })
            })}
            className="flex flex-col gap-4"
          >
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
                    <Input
                      disabled
                      placeholder="E-mail"
                      {...field}
                      value={field.value || ''}
                      readOnly
                    />
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
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
