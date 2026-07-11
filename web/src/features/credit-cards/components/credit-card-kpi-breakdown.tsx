import { CreditCardKpiSummaryLine } from './credit-card-kpi-summary-line'

type CreditCardKpiBreakdownProps = {
  previousBalance: number
  purchases: number
  purchasesLabel: string
  payments: number
  invoiceTotal: number
  pendingSplitRemaining: number
  onViewAReceber?: () => void
}

export function CreditCardKpiBreakdown({
  previousBalance,
  purchases,
  purchasesLabel,
  payments,
  invoiceTotal,
  pendingSplitRemaining,
  onViewAReceber,
}: CreditCardKpiBreakdownProps) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Composição</p>
      <div className="space-y-2">
        {previousBalance > 0 && (
          <CreditCardKpiSummaryLine label="Saldo anterior" amount={previousBalance} />
        )}
        <CreditCardKpiSummaryLine label={`Compras (${purchasesLabel})`} amount={purchases} />
        {payments > 0 && (
          <CreditCardKpiSummaryLine label="Pagamentos" amount={payments} negative />
        )}
        <div className="border-t border-dashed border-slate-200 pt-2">
          <CreditCardKpiSummaryLine label="Total da fatura" amount={invoiceTotal} emphasis />
        </div>
        {pendingSplitRemaining > 0 && (
          <CreditCardKpiSummaryLine
            label="A receber de divisões"
            amount={pendingSplitRemaining}
            action={
              onViewAReceber ? { label: 'Ver', onClick: onViewAReceber } : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
