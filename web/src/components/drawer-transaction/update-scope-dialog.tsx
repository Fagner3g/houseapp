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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (updateSeries: boolean) => void
}

export function UpdateScopeDialog({ open, onOpenChange, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
          <AlertDialogDescription>
            Esta transação faz parte de uma série. Deseja aplicar as alterações somente nesta
            parcela ou em toda a série?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-col-reverse sm:justify-stretch">
          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Toda a série
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => onConfirm(false)}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
          >
            Somente esta parcela
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
