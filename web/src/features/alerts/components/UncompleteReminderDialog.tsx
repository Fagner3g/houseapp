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

type UncompleteReminderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting?: boolean
}

export function UncompleteReminderDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: UncompleteReminderDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desmarcar lembrete</AlertDialogTitle>
          <AlertDialogDescription>
            Este lembrete registrou uma transação ao ser concluído. Ao desmarcar, a transação
            vinculada será cancelada. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-col-reverse sm:justify-stretch">
          <AlertDialogCancel disabled={isSubmitting} className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            Desmarcar e cancelar transação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
