import { zodResolver } from '@hookform/resolvers/zod'
import { DialogClose } from '@radix-ui/react-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { getListOrganizationsQueryKey, useCreateOrganization } from '@/api/generated/api'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

type FormValues = z.infer<typeof schema>

export function ModalNewOrganization({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { setOrganization } = useActiveOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { mutateAsync: createOrganization, isPending } = useCreateOrganization()

  async function handleSubmit(data: FormValues) {
    try {
      const res = await createOrganization({ data })
      toast.success('Organização criada!')
      await queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() })
      setOrganization(res.slug)
      form.reset()
      setIsOpen(false)
    } catch {
      toast.error('Erro ao criar organização')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar organização</DialogTitle>
          <DialogDescription>Preencha o nome da organização.</DialogDescription>
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
                    <Input placeholder="Nome da organização" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" isLoading={isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

