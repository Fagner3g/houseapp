import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ImportStatementTriggerButton } from '@/features/accounts/components/import-statement-trigger-button'
import type { AccountsHubKind } from '@/features/accounts/components/accounts-hub-sub-nav'
import { currentMonthKey } from '@/lib/date-range'

interface AccountsHubEmptyStateProps {
  kind: AccountsHubKind
  onCreate: () => void
  onImported: (accountId: string) => void
  onViewExistingStatement: (args: { accountId: string; monthKey: string }) => void
}

export function AccountsHubEmptyState({
  kind,
  onCreate,
  onImported,
  onViewExistingStatement,
}: AccountsHubEmptyStateProps) {
  if (kind === 'cards') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-slate-500">Nenhum cartão cadastrado.</p>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          Importe uma fatura OFX do Nubank para cadastrar o cartão e começar a acompanhar seus
          gastos.
        </p>
        <div className="mt-6">
          <ImportStatementTriggerButton
            onImported={onImported}
            onViewExistingStatement={onViewExistingStatement}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-slate-500">Nenhuma conta cadastrada.</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">
        Cadastre uma conta corrente, poupança ou carteira para acompanhar lançamentos e análises.
      </p>
      <Button className="mt-6 rounded-lg" onClick={onCreate}>
        <Plus className="mr-1.5 size-4" />
        Adicionar conta
      </Button>
      <p className="mt-3 text-xs text-slate-400">Mês atual: {currentMonthKey()}</p>
    </div>
  )
}
