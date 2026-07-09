import { AlertTriangle } from 'lucide-react'

export function TransactionDeadlineAlert() {
  return (
    <div className="mx-4 rounded-lg border border-sky-200/80 bg-sky-50 px-4 py-4 lg:mx-6">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-sky-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-sky-900">Atenção aos prazos</p>
          <p className="text-sm text-sky-800/90">
            Estes lançamentos passaram da data de vencimento. Mantenha seu planejamento em fluxo de
            caixa saudável.
          </p>
        </div>
      </div>
    </div>
  )
}
