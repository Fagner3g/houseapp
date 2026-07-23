import { useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerInput } from '@/components/ui/date-picker-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency'
import { dateToCalendarDate } from '@/lib/date'

import type { SplitPaymentMethod } from '../lib/unified-settlement'
import {
  markSplitReceivedAmountLabel,
  markSplitReceivedConfirmLabel,
  markSplitReceivedDateLabel,
  markSplitReceivedDialogDescription,
  markSplitReceivedDialogTitle,
  markSplitReceivedDismissLabel,
  markSplitReceivedRemainingHint,
} from '../lib/split-reimbursement-copy'

export type MarkSplitReceivedConfirm = {
  amountReais: number
  method: SplitPaymentMethod
  /** Local calendar date `YYYY-MM-DD`. */
  paidAt: string
}

type MarkSplitReceivedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personLabel: string
  remainingReais: number
  isPending?: boolean
  onConfirm: (input: MarkSplitReceivedConfirm) => void | Promise<void>
}

export function MarkSplitReceivedDialog({
  open,
  onOpenChange,
  personLabel,
  remainingReais,
  isPending,
  onConfirm,
}: MarkSplitReceivedDialogProps) {
  const [amountReais, setAmountReais] = useState(remainingReais)
  const [method, setMethod] = useState<SplitPaymentMethod>('other')
  const [paidAt, setPaidAt] = useState(() => dateToCalendarDate(new Date()))
  const amountInputId = useId()
  const dateInputId = useId()

  useEffect(() => {
    if (!open) return
    setAmountReais(remainingReais)
    setMethod('other')
    setPaidAt(dateToCalendarDate(new Date()))
  }, [open, remainingReais])

  const maxReais = Math.max(0, remainingReais)
  const isValid =
    amountReais > 0.005 &&
    amountReais <= maxReais + 0.005 &&
    maxReais > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(paidAt)

  const handleConfirm = async () => {
    if (!isValid) return
    await onConfirm({
      amountReais: Math.min(amountReais, maxReais),
      method,
      paidAt,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{markSplitReceivedDialogTitle()}</DialogTitle>
          <DialogDescription>
            {markSplitReceivedDialogDescription(personLabel)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {markSplitReceivedRemainingHint(formatCurrency(maxReais))}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={amountInputId}>
              {markSplitReceivedAmountLabel()}
            </Label>
            <CurrencyInput
              id={amountInputId}
              value={amountReais}
              onValueChange={value => setAmountReais(value ?? 0)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={dateInputId}>{markSplitReceivedDateLabel()}</Label>
            <DatePickerInput
              id={dateInputId}
              value={paidAt}
              onChange={setPaidAt}
              placeholder="dd/mm/aaaa"
              disabled={isPending}
              maxDate={new Date()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Forma</Label>
            <Select
              value={method}
              onValueChange={value => setMethod(value as SplitPaymentMethod)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {markSplitReceivedDismissLabel()}
          </Button>
          <Button
            type="button"
            disabled={!isValid || isPending}
            onClick={() => void handleConfirm()}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Registrando...
              </>
            ) : (
              markSplitReceivedConfirmLabel()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
