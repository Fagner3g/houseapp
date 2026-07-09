import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getListCategoriesQueryKey, useDeleteCategory } from '@/api/generated/api'
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
import { useActiveOrganization } from '@/hooks/use-active-organization'

type DeleteCategoryTarget = {
  id: string
  name: string
}

interface DeleteCategoryDialogProps {
  category: DeleteCategoryTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutateAsync: deleteCategory, isPending } = useDeleteCategory()

  const handleConfirm = async () => {
    if (!slug || !category) return

    try {
      await deleteCategory({ slug, id: category.id })
      await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(slug) })
      toast.success('Categoria excluída')
      onOpenChange(false)
      onDeleted?.()
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="size-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl">Excluir categoria</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {category ? (
          <p className="text-sm text-foreground">
            Excluir a categoria <span className="font-semibold">{category.name}</span>? Lançamentos
            vinculados ficarão sem essa categoria.
          </p>
        ) : null}

        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="w-full sm:w-auto" disabled={isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async event => {
              event.preventDefault()
              await handleConfirm()
            }}
            className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600 sm:w-auto"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                Excluir
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
