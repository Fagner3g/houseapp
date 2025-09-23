import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'
import type z from 'zod'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useAuthStore } from '@/stores/auth'

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
  onDelete?: (data: EditableUser) => void
  isSubmitting?: boolean
  isDeleting?: boolean
}

export function ModalEditUser({
  open,
  onOpenChange,
  user,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting,
}: ModalEditUserProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const currentUser = useAuthStore(s => s.user)
  type FormValues = z.infer<typeof schemaSignUp>
  const form = useForm<FormValues>({ resolver: zodResolver(schemaSignUp) })
  const registerWithMask = useHookFormMask(form.register)

  // Verificar se o usuário atual é o dono e está tentando excluir a si mesmo
  const isCurrentUserOwner = currentUser?.email === user?.email

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>Usuário</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl">Editar usuário</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Atualize as informações do usuário
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(values => {
                onSubmit({ name: values.name, email: values.email, phone: values.phone })
              })}
              className="space-y-6"
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nome completo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite o nome completo"
                          value={field.value || ''}
                          className="h-11"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">E-mail</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          placeholder="E-mail"
                          {...field}
                          value={field.value || ''}
                          readOnly
                          className="h-11 bg-muted/50"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        O e-mail não pode ser alterado
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Telefone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          {...registerWithMask('phone', ['(99) 99999-9999', '(99) 9999-9999'], {
                            required: true,
                          })}
                          value={field.value || ''}
                          placeholder="(00) 00000-0000"
                          type="tel"
                          className="h-11"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

               <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-4 border-t">
                 <div className="flex justify-center sm:justify-start">
                   {onDelete && !isCurrentUserOwner && (
                     <Button
                       type="button"
                       variant="ghost"
                       onClick={() => setShowDeleteDialog(true)}
                       disabled={isSubmitting || isDeleting}
                       className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                     >
                       <Trash2 className="mr-2 h-4 w-4" />
                       Excluir usuário
                     </Button>
                   )}
                   {isCurrentUserOwner && (
                     <div className="text-xs text-muted-foreground text-center sm:text-left">
                       Você não pode excluir sua própria conta
                     </div>
                   )}
                 </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={isSubmitting} className="flex-1 sm:flex-none">
                    Salvar alterações
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Excluir usuário</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Esta ação não pode ser desfeita
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="text-sm text-foreground">
              Tem certeza que deseja excluir o usuário{' '}
              <span className="font-semibold text-foreground">{user?.name}</span>?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Todos os dados relacionados a este usuário serão removidos permanentemente.
            </p>
          </div>

          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (user && onDelete) {
                  onDelete(user)
                  setShowDeleteDialog(false)
                  onOpenChange(false)
                }
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>Carregando</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir usuário
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
