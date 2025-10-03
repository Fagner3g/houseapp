import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getListOrganizationsQueryKey, useCreateOrganization } from '@/api/generated/api'
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

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

export type FormValues = z.infer<typeof schema>

interface ModalNewOrganizationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalNewOrganization({ open, onOpenChange }: ModalNewOrganizationProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const queryClient = useQueryClient()
  const { setOrganization } = useActiveOrganization()
  const { mutateAsync: createOrganization, isPending } = useCreateOrganization()
  const [isRedirecting, setIsRedirecting] = useState(false)

  async function handleSubmit(data: FormValues) {
    setIsRedirecting(true)
    const result = await createOrganization({ data })
    toast.success('Organização criada!')
    await queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() })
    // Atualiza org ativa (essa função já navega mantendo o path atual para o novo slug)
    setOrganization(result.slug)
    onOpenChange(false)
    form.reset({ name: '' })
    setIsRedirecting(false)
  }

  function handleTrySubmit() {
    const errors = form.formState.errors
    for (const [, value] of Object.entries(errors)) {
      if (value?.message) {
        toast.error(value.message as string)
        break
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {isRedirecting ? (
          <div className="flex flex-col items-center gap-3 p-6 text-sm">
            <div className="animate-spin size-6 rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p>Preparando seu espaço e redirecionando…</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nova organização</DialogTitle>
              <DialogDescription>Crie uma nova area de trabalho.</DialogDescription>
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
                        <Input {...field} placeholder="Nome da organização" disabled={isPending} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" onClick={handleTrySubmit} isLoading={isPending}>
                    Criar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
