import { Loader2, Trash2 } from 'lucide-react'

import type { ListAccounts200AccountsItem } from '@/api/generated/model'
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

interface DeleteAccountDialogProps {
  account: ListAccounts200AccountsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
}

export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: DeleteAccountDialogProps) {
  const isCard = account?.type === 'credit_card'
  const entity = isCard ? 'cartão' : 'conta'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <Trash2 className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl">
                Excluir {entity}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <p className="text-sm text-foreground">
          Tem certeza que deseja excluir {isCard ? 'o cartão' : 'a conta'}{' '}
          <span className="font-semibold">{account?.name}</span>?{' '}
          {isCard
            ? 'Ele deixará de aparecer na sua lista de cartões.'
            : 'Ela deixará de aparecer na sua lista de contas.'}
        </p>

        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="w-full sm:w-auto" disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async event => {
              event.preventDefault()
              await onConfirm()
            }}
            className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600 sm:w-auto"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                Excluir {entity}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
