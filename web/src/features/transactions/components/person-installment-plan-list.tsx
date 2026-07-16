import type { GetSplitDebtSummary200PersonsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from './splits/split-status'

type PersonInstallment = GetSplitDebtSummary200PersonsItem['installments'][number]

type PersonInstallmentPlanListProps = {
  installments: PersonInstallment[]
  installmentsTotal: number | null
  currentTransactionId: string
}

export function PersonInstallmentPlanList({
  installments,
  installmentsTotal,
  currentTransactionId,
}: PersonInstallmentPlanListProps) {
  return (
    <ul className="space-y-1.5 pt-1.5">
      {installments.map(installment => {
        const isCurrent = installment.transactionId === currentTransactionId
        const remaining =
          moneyStringToReais(installment.amount) - moneyStringToReais(installment.paidAmount)

        return (
          <li
            key={installment.splitId}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
              isCurrent && 'bg-white ring-1 ring-slate-200'
            )}
          >
            <span className="text-slate-600">
              Parcela {installment.installmentNumber}/{installmentsTotal}
              {isCurrent && (
                <span className="ml-1 text-xs font-medium text-slate-500">(esta)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-slate-800">
                {formatMoneyString(installment.amount)}
              </span>
              <Badge
                variant={SPLIT_STATUS_VARIANT[installment.status]}
                className="text-[10px] uppercase"
              >
                {installment.status === 'partial'
                  ? `Falta ${formatMoneyString(reaisToMoneyString(remaining))}`
                  : SPLIT_STATUS_LABELS[installment.status]}
              </Badge>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
