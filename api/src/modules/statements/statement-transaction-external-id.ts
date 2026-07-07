import { createHash } from 'node:crypto'

export type StatementExternalIdInput = {
  date: string
  title: string
  amount: string
  type: 'income' | 'expense'
  installmentNumber?: number
  installmentsTotal?: number
}

function fingerprintKey(input: StatementExternalIdInput): string {
  const installment =
    input.installmentNumber != null && input.installmentsTotal != null
      ? `${input.installmentNumber}/${input.installmentsTotal}`
      : ''

  return `${input.date}|${input.title.trim()}|${input.amount}|${input.type}|${installment}`
}

export function buildStatementExternalId(
  input: StatementExternalIdInput,
  ordinal: number
): string {
  return createHash('sha256')
    .update(`${fingerprintKey(input)}|${ordinal}`)
    .digest('hex')
}

export function assignStatementExternalIds<
  T extends StatementExternalIdInput,
>(transactions: T[]): Array<T & { externalId: string }> {
  const ordinalByKey = new Map<string, number>()

  return transactions.map(tx => {
    const key = fingerprintKey(tx)
    const ordinal = (ordinalByKey.get(key) ?? 0) + 1
    ordinalByKey.set(key, ordinal)

    return {
      ...tx,
      externalId: buildStatementExternalId(tx, ordinal),
    }
  })
}
