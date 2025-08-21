import { zodResolver } from '@hookform/resolvers/zod'
import { DialogClose } from '@radix-ui/react-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  getListOrganizationsQueryKey,
  useListOrganizations,
  useRenameOrg,
} from '@/api/generated/api'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
})

interface ModalEditOrganizationProps {
  children: ReactNode
}

type FormValues = z.infer<typeof schema>

export function ModalEditOrganization({ children }: ModalEditOrganizationProps) {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()
  const { data } = useListOrganizations()
  const org = data?.organizations.find(o => o.slug === slug)
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: org?.name ?? '', description: org?.description ?? '' },
  })
  const { mutateAsync: renameOrg, isPending } = useRenameOrg()

  useEffect(() => {
    form.reset({ name: org?.name ?? '', description: org?.description ?? '' })
  }, [org, form])

  async function handleSubmit(values: FormValues) {
    if (!slug) return
    try {
      await renameOrg({ slug, data: values })
      toast.success('Organização atualizada!')
      await queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() })
      setIsOpen(false)
    } catch {
      toast.error('Erro ao atualizar organização')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar organização</DialogTitle>
          <DialogDescription>Atualize os dados da organização.</DialogDescription>
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição da organização" {...field} />
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
