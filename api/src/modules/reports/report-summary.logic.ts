import type { AccountType } from '@/db/schemas/accounts'

export type AccountBalanceRow = {
  type: AccountType
  balance: bigint
}

/** Patrimônio líquido: saldo das contas líquidas (cartão de crédito é dívida separada). */
export function sumNetWorth(accounts: AccountBalanceRow[]): bigint {
  return accounts
    .filter(row => row.type !== 'credit_card')
    .reduce((sum, row) => sum + row.balance, 0n)
}
