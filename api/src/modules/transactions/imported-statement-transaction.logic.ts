import { badRequest } from '@/core/errors'
import { parseCentavos } from '@/core/money'

type ImportedStatementTransactionLike = {
  source: string
  statementId: string | null
  title: string
  amount: bigint | null
  type: string
  date: Date
  competenceDate: Date | null
  accountId: string | null
  cardId: string | null
  counterparty: string | null
  installmentNumber: number | null
  installmentsTotal: number | null
}

type ImportedStatementUpdateLike = {
  title?: string
  amount?: string | null
  type?: string
  date?: string
  competenceDate?: string | null
  accountId?: string | null
  cardId?: string | null
  statementId?: string | null
  counterparty?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  source?: string
}

export function isImportedStatementTransaction(
  transaction: Pick<ImportedStatementTransactionLike, 'source' | 'statementId'>
) {
  return transaction.source === 'import' && transaction.statementId != null
}

function sameDate(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

export function assertImportedStatementUpdateAllowed(
  existing: ImportedStatementTransactionLike,
  input: ImportedStatementUpdateLike
) {
  if (!isImportedStatementTransaction(existing)) return

  if (input.title !== undefined && input.title !== existing.title) {
    throw badRequest('Imported statement lines cannot change description')
  }

  if (input.amount != null && parseCentavos(input.amount) !== existing.amount) {
    throw badRequest('Imported statement lines cannot change amount')
  }

  if (input.type !== undefined && input.type !== existing.type) {
    throw badRequest('Imported statement lines cannot change type')
  }

  if (input.date !== undefined && !sameDate(new Date(input.date), existing.date)) {
    throw badRequest('Imported statement lines cannot change date')
  }

  if (input.competenceDate !== undefined) {
    const next = input.competenceDate ? new Date(input.competenceDate) : null
    const current = existing.competenceDate

    if (next == null && current != null) {
      throw badRequest('Imported statement lines cannot change competence date')
    }

    if (next != null && (current == null || !sameDate(next, current))) {
      throw badRequest('Imported statement lines cannot change competence date')
    }
  }

  if (input.accountId !== undefined && input.accountId !== existing.accountId) {
    throw badRequest('Imported statement lines cannot change account')
  }

  if (input.cardId !== undefined && input.cardId !== existing.cardId) {
    throw badRequest('Imported statement lines cannot change card')
  }

  if (input.statementId !== undefined && input.statementId !== existing.statementId) {
    throw badRequest('Imported statement lines cannot change statement')
  }

  if (input.counterparty !== undefined && input.counterparty !== existing.counterparty) {
    throw badRequest('Imported statement lines cannot change counterparty')
  }

  if (
    input.installmentNumber !== undefined &&
    input.installmentNumber !== existing.installmentNumber
  ) {
    throw badRequest('Imported statement lines cannot change installment number')
  }

  if (
    input.installmentsTotal !== undefined &&
    input.installmentsTotal !== existing.installmentsTotal
  ) {
    throw badRequest('Imported statement lines cannot change installments total')
  }

  if (input.source !== undefined && input.source !== 'import') {
    throw badRequest('Imported statement lines cannot change source')
  }
}
