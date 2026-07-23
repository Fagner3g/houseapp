import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import {
  payInstallmentScopeConfirmLabel,
  payInstallmentScopeDescription,
  payInstallmentScopeTitle,
  type SettlementKind,
} from '../../lib/settlement-copy'
import type { UnsettledSplitItem } from '../../split-debt-summary.utils'
import { AdvanceExtras } from './advance-extras'
import { AllocationPreview } from './allocation-preview'
import { CurrentPaymentHero } from './current-payment-hero'
import { ReimbursementSection } from './reimbursement-section'
import { usePayInstallmentScope } from './use-pay-installment-scope'
import type { PayInstallmentScopeResult } from './types'

export type { PayInstallmentScope, PayInstallmentScopeResult } from './types'

const EMPTY_UNSETTLED: UnsettledSplitItem[] = []

type PayInstallmentScopeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: SettlementKind
  currentInstallmentNumber: number
  installmentsTotal: number
  currentInstallmentAmountReais: number
  currentRemainingReais: number
  installments: GetInstallmentSeries200InstallmentsItem[]
  unsettledSplits?: UnsettledSplitItem[]
  onConfirm: (result: PayInstallmentScopeResult) => void
}

export function PayInstallmentScopeDialog({
  open,
  onOpenChange,
  kind,
  currentInstallmentNumber,
  installmentsTotal,
  currentInstallmentAmountReais,
  currentRemainingReais,
  installments,
  unsettledSplits = EMPTY_UNSETTLED,
  onConfirm,
}: PayInstallmentScopeDialogProps) {
  const scope = usePayInstallmentScope({
    open,
    currentInstallmentNumber,
    currentRemainingReais,
    installments,
    unsettledSplits,
  })

  const finish = () => {
    const result = scope.buildResult()
    if (!result) return
    onConfirm(result)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1.5 border-b border-slate-100 px-6 py-5 pr-12">
          <DialogTitle className="text-xl tracking-tight">
            {payInstallmentScopeTitle(kind)}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {payInstallmentScopeDescription(kind, { withSplits: scope.withSplits })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[min(70vh,36rem)] flex-col gap-4 overflow-y-auto px-6 py-5">
          <CurrentPaymentHero
            kind={kind}
            installmentNumber={currentInstallmentNumber}
            installmentsTotal={installmentsTotal}
            installmentAmountReais={currentInstallmentAmountReais}
            remainingReais={currentRemainingReais}
            paidAmountReais={scope.paidAmountReais}
            onPaidAmountChange={scope.setPaidAmountFromInput}
            nextInstallmentNumber={scope.future[0]?.installmentNumber ?? null}
            nextInstallmentAmountReais={
              scope.future[0] != null
                ? Number.parseFloat(scope.future[0].amount)
                : null
            }
            amountLocked={false}
          />

          <AllocationPreview kind={kind} preview={scope.preview} />

          <div className="space-y-2.5">
            <AdvanceExtras
              kind={kind}
              currentInstallmentNumber={currentInstallmentNumber}
              extraInstallments={scope.extras}
              selectedIds={scope.selectedIds}
              onSelectedIdsChange={scope.selectAdvances}
              open={scope.advanceOpen}
              onOpenChange={scope.setAdvanceOpen}
              disabled={false}
            />

            <ReimbursementSection
              items={unsettledSplits}
              choices={scope.reimbursements}
              onChange={scope.updateReimbursement}
              open={scope.reimbursementOpen}
              onOpenChange={scope.setReimbursementOpen}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-600"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!scope.canConfirm}
            className="min-w-[12rem] rounded-xl"
            onClick={finish}
          >
            {payInstallmentScopeConfirmLabel(kind)} ·{' '}
            {formatCurrency(scope.confirmAmount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
