import { zodResolver } from '@hookform/resolvers/zod'
import { DialogClose } from '@radix-ui/react-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { getListOrganizationsQueryKey, useRenameOrg } from '@/api/generated/api'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

export type FormValues = z.infer<typeof schema>

interface ModalEditOrganizationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgSlug: string
  currentName: string
}

export function ModalEditOrganization({ open, onOpenChange, orgSlug, currentName }: ModalEditOrganizationProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: currentName },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: currentName })
    }
  }, [open, currentName, form])

  const queryClient = useQueryClient()
  const { mutateAsync: renameOrg, isPending } = useRenameOrg()

  async function handleSubmit(data: FormValues) {
    await renameOrg({ slug: orgSlug, data })
    toast.success('Organização atualizada!')
    await queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() })
    onOpenChange(false)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar organização</DialogTitle>
          <DialogDescription>Altere o nome da organização.</DialogDescription>
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
                    <Input {...field} value={field.value || ''} placeholder="Nome da organização" />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" onClick={handleTrySubmit} isLoading={isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
