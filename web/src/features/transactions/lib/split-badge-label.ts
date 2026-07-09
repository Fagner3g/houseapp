import { formatMoneyString, moneyStringToReais, reaisToCents } from '@/lib/currency'

export type PartialSplitBadgeInfo = {
  splitWithName: string
  splitAmount: string
  transactionAmount: string
}

/** True when split amount is exactly half of the transaction (50/50). */
export function isHalfSplit(splitAmount: string, transactionAmount: string): boolean {
  const splitCents = reaisToCents(moneyStringToReais(splitAmount))
  const totalCents = reaisToCents(moneyStringToReais(transactionAmount))
  if (totalCents <= 0 || splitCents <= 0) return false
  return splitCents * 2 === totalCents
}

export function formatDelegatedSplitBadge(name: string): string {
  return `Delegada · ${name}`
}

export function formatPartialSplitBadge(info: PartialSplitBadgeInfo): string {
  const { splitWithName, splitAmount, transactionAmount } = info
  if (isHalfSplit(splitAmount, transactionAmount)) {
    return `50/50 · ${splitWithName}`
  }
  return `Valor · ${formatMoneyString(splitAmount)} · ${splitWithName}`
}
