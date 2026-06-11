import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'
import { z } from 'zod'

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
import { Checkbox } from '@/components/ui/checkbox'
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

const alertPreferencesSchema = z.object({
  whatsapp: z.boolean(),
  inApp: z.boolean(),
  extension: z.boolean(),
})

const schemaEditUser = z.object({
  name: z.string('O nome é obrigatório').min(1).max(50),
  email: z.email('E-mail inválido'),
  phone: z
    .string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, {
      error: 'Informe um telefone válido com DDD',
    }),
  notificationsEnabled: z.boolean().default(true),
  alertPreferences: alertPreferencesSchema.default({
    whatsapp: true,
    inApp: true,
    extension: true,
  }),
})

import { useAuthStore } from '@/stores/auth'

export type AlertPreferences = z.infer<typeof alertPreferencesSchema>

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  whatsapp: true,
  inApp: true,
  extension: true,
}

export type EditableUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  notificationsEnabled?: boolean
  alertPreferences?: AlertPreferences
}

export type RemoveUserMode = 'deactivate' | 'delete'

interface ModalEditUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: EditableUser | null
  onSubmit: (data: EditableUser) => void
  onDelete?: (data: EditableUser, mode: RemoveUserMode) => Promise<void> | void
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
  const [removeMode, setRemoveMode] = useState<RemoveUserMode>('deactivate')
  const currentUser = useAuthStore(s => s.user)
  type FormValues = z.infer<typeof schemaEditUser>
  const form = useForm<FormValues>({ resolver: zodResolver(schemaEditUser) })
  const registerWithMask = useHookFormMask(form.register)

  const isCurrentUserOwner = currentUser?.email === user?.email

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        notificationsEnabled: user.notificationsEnabled ?? true,
        alertPreferences: user.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
      })
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        notificationsEnabled: true,
        alertPreferences: DEFAULT_ALERT_PREFERENCES,
      })
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
                if (user) {
                  onSubmit({
                    id: user.id,
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                    notificationsEnabled: values.notificationsEnabled,
                    alertPreferences: values.alertPreferences,
                  })
                }
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
                          type="email"
                          placeholder="Digite o e-mail"
                          {...field}
                          value={field.value || ''}
                          className="h-11"
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

                <FormField
                  control={form.control}
                  name="notificationsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">Receber notificações</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Interruptor principal para alertas via WhatsApp
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Canais de alerta</p>
                  <FormField
                    control={form.control}
                    name="alertPreferences.whatsapp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">WhatsApp</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alertPreferences.inApp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">App</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alertPreferences.extension"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">Extensão</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
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

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={open => {
          setShowDeleteDialog(open)
          if (!open) setRemoveMode('deactivate')
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Remover usuário</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Escolha como deseja remover este usuário
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              O que fazer com{' '}
              <span className="font-semibold text-foreground">{user?.name}</span>?
            </p>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="removeMode"
                  value="deactivate"
                  checked={removeMode === 'deactivate'}
                  onChange={() => setRemoveMode('deactivate')}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Desativar</p>
                  <p className="text-xs text-muted-foreground">
                    Remove o acesso à organização, mas mantém a conta e o histórico.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
                <input
                  type="radio"
                  name="removeMode"
                  value="delete"
                  checked={removeMode === 'delete'}
                  onChange={() => setRemoveMode('delete')}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Excluir permanentemente</p>
                  <p className="text-xs text-muted-foreground">
                    Remove a conta do sistema. Disponível apenas se o usuário não tiver transações
                    ou vínculos em outras organizações.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (user && onDelete) {
                  await onDelete(user, removeMode)
                  setShowDeleteDialog(false)
                  setRemoveMode('deactivate')
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
                  {removeMode === 'delete' ? 'Excluindo...' : 'Desativando...'}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {removeMode === 'delete' ? 'Excluir permanentemente' : 'Desativar usuário'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
