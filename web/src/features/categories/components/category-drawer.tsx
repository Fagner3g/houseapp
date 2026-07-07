import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getListCategoriesQueryKey,
  useCreateCategory,
  useUpdateCategory,
} from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'
import {
  stackyDrawerContent,
  stackyDrawerContentNested,
  stackyDrawerOverlay,
  stackyDrawerCloseButton,
  stackyDrawerFooter,
  stackyDrawerHeader,
  stackyDrawerTitle,
  stackySegmentItem,
  stackySegmentItemExpense,
  stackySegmentItemIncome,
  stackyTypeSegmentedControl,
} from '@/lib/ui-classes'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['income', 'expense']),
})

type CategoryFormValues = z.infer<typeof categorySchema>

export function CategoryDrawer({ nested = false }: { nested?: boolean }) {
  const { slug } = useActiveOrganization()
  const open = useDrawerStore(s => s.categoryDrawerOpen)
  const mode = useDrawerStore(s => s.categoryDrawerMode)
  const defaultType = useDrawerStore(s => s.categoryDrawerDefaultType)
  const editingCategory = useDrawerStore(s => s.editingCategory)
  const transactionOpen = useDrawerStore(s => s.transactionDrawerOpen)
  const close = useDrawerStore(s => s.closeCategoryDrawer)
  const callback = useDrawerStore(s => s.categoryDrawerCallback)
  const queryClient = useQueryClient()
  const { mutateAsync: createCategory, isPending: isCreating } = useCreateCategory()
  const { mutateAsync: updateCategory, isPending: isUpdating } = useUpdateCategory()

  const isEdit = mode === 'edit'
  const isPending = isCreating || isUpdating

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', type: 'expense' },
  })

  useEffect(() => {
    if (!open) return

    if (isEdit && editingCategory) {
      form.reset({
        name: editingCategory.name,
        type: editingCategory.type,
      })
      return
    }

    form.reset({ name: '', type: defaultType ?? 'expense' })
  }, [open, isEdit, editingCategory, defaultType, form])

  const onSubmit = async (values: CategoryFormValues) => {
    if (!slug) return

    try {
      if (isEdit && editingCategory) {
        await updateCategory({
          slug,
          id: editingCategory.id,
          data: { name: values.name, type: values.type },
        })
        toast.success('Categoria atualizada')
      } else {
        const result = await createCategory({
          slug,
          data: { name: values.name, type: values.type },
        })
        callback?.(result.category.id)
        toast.success('Categoria criada')
      }

      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(slug) })
      if (isEdit) callback?.(editingCategory!.id)
      close()
    } catch {
      toast.error(isEdit ? 'Erro ao atualizar categoria' : 'Erro ao criar categoria')
    }
  }

  if (nested && !transactionOpen) return null
  if (!nested && transactionOpen) return null

  const drawerContentClass = nested ? stackyDrawerContentNested : stackyDrawerContent

  const panel = (
    <DrawerContent
      className={drawerContentClass}
      hideOverlay={nested}
      overlayClassName={stackyDrawerOverlay}
      onOverlayDismiss={close}
    >
      <DrawerHeader className={stackyDrawerHeader}>
        <DrawerTitle className={stackyDrawerTitle}>
          {isEdit ? 'Editar Categoria' : 'Nova Categoria'}
        </DrawerTitle>
        <button
          type="button"
          aria-label="Fechar"
          className={stackyDrawerCloseButton}
          onClick={close}
        >
          <X className="size-5" />
        </button>
      </DrawerHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4 p-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mercado..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={value => {
                        if (value) field.onChange(value)
                      }}
                      className={stackyTypeSegmentedControl}
                    >
                      <ToggleGroupItem
                        value="expense"
                        className={`${stackySegmentItem} ${stackySegmentItemExpense} gap-1.5`}
                      >
                        <ArrowDown className="size-3.5" />
                        Despesa
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="income"
                        className={`${stackySegmentItem} ${stackySegmentItemIncome} gap-1.5`}
                      >
                        <ArrowUp className="size-3.5" />
                        Receita
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DrawerFooter className={stackyDrawerFooter}>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                disabled={isPending}
              >
                {isEdit ? 'Salvar alterações' : 'Criar'}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </Form>
    </DrawerContent>
  )

  if (nested) {
    return (
      <DrawerNestedRoot open={open} onOpenChange={v => !v && close()} direction="right">
        {panel}
      </DrawerNestedRoot>
    )
  }

  return (
    <Drawer open={open} onOpenChange={v => !v && close()} direction="right" modal>
      {panel}
    </Drawer>
  )
}
