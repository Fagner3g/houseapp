import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type { UnsettledSplitItem } from '../split-debt-summary.utils'
import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from './splits/split-status'

interface SplitPaymentConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: UnsettledSplitItem[]
  isPending?: boolean
  onConfirm: () => void | Promise<void>
  onDecline: () => void
}

export function SplitPaymentConfirmDialog({
  open,
  onOpenChange,
  items,
  isPending = false,
  onConfirm,
  onDecline,
}: SplitPaymentConfirmDialogProps) {
  const singleItem = items.length === 1 ? items[0] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transação dividida</DialogTitle>
          <DialogDescription>
            {singleItem
              ? `${singleItem.label} deve ${formatCurrency(singleItem.remainingReais)} nesta parcela.`
              : 'Esta transação tem divisões pendentes nesta parcela.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.split.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{item.label}</p>
                <p className="text-sm tabular-nums text-slate-600">
                  Falta {formatCurrency(item.remainingReais)}
                </p>
              </div>
              <Badge variant={SPLIT_STATUS_VARIANT[item.split.status]} className="shrink-0 text-[10px] uppercase">
                {SPLIT_STATUS_LABELS[item.split.status]}
              </Badge>
            </div>
          ))}

          <p className="text-sm text-slate-700">
            {singleItem
              ? `${singleItem.label} já pagou a parte dela?`
              : 'As pessoas acima já pagaram a parte delas?'}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => void onConfirm()}
            className="w-full"
          >
            Sim, já pagou
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onDecline}
            className="w-full"
          >
            Ainda não
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SplitPaymentPayBannerProps {
  items: UnsettledSplitItem[]
  className?: string
}

export function SplitPaymentPayBanner({ items, className }: SplitPaymentPayBannerProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2', className)}>
      <p className="text-sm font-medium text-amber-900">Esta transação está dividida</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.split.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-amber-900">{item.label}</span>
            <span className="flex items-center gap-2">
              <span className="tabular-nums text-amber-800">
                Falta {formatCurrency(item.remainingReais)}
              </span>
              <Badge variant={SPLIT_STATUS_VARIANT[item.split.status]} className="text-[10px] uppercase">
                {SPLIT_STATUS_LABELS[item.split.status]}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-800">
        Ao confirmar o pagamento, você será perguntado se a outra pessoa já quitou a parte dela.
      </p>
    </div>
  )
}
