import { formatMoneyString, moneyStringToReais, reaisToCents } from '@/lib/currency'

export type SplitBadgePerspective = 'creditor' | 'debtor'

export type PartialSplitBadgeInfo = {
  splitWithName: string
  splitAmount: string
  transactionAmount: string
  creditorName?: string
}

export type SplitBadgeSettlement = 'pending' | 'received'

/** True when split amount is exactly half of the transaction (50/50). */
export function isHalfSplit(splitAmount: string, transactionAmount: string): boolean {
  const splitCents = reaisToCents(moneyStringToReais(splitAmount))
  const totalCents = reaisToCents(moneyStringToReais(transactionAmount))
  if (totalCents <= 0 || splitCents <= 0) return false
  return splitCents * 2 === totalCents
}

export function resolveSplitBadgeSettlement(
  remaining: number | undefined
): SplitBadgeSettlement | undefined {
  if (remaining === undefined) return undefined
  return remaining > 0 ? 'pending' : 'received'
}

export function resolveSplitBadgePerspective(
  debtorUserId: string | null | undefined,
  currentUserId: string | null | undefined
): SplitBadgePerspective {
  if (currentUserId && debtorUserId && currentUserId === debtorUserId) return 'debtor'
  return 'creditor'
}

export function formatDelegatedSplitBadge(
  name: string,
  settlement?: SplitBadgeSettlement,
  perspective: SplitBadgePerspective = 'creditor',
  creditorName?: string
): string {
  if (perspective === 'debtor') {
    const other = creditorName?.trim()
    if (settlement === 'received') return other ? `Pago · ${other}` : 'Pago'
    if (settlement === 'pending') return other ? `A pagar · ${other}` : 'A pagar'
    return other ? `Dividida · ${other}` : 'Dividida'
  }
  if (settlement === 'received') return `Recebido · ${name}`
  if (settlement === 'pending') return `A receber · ${name}`
  return `Delegada · ${name}`
}

export function formatPartialSplitBadge(
  info: PartialSplitBadgeInfo,
  settlement?: SplitBadgeSettlement,
  perspective: SplitBadgePerspective = 'creditor'
): string {
  const { splitWithName, splitAmount, transactionAmount, creditorName } = info
  if (perspective === 'debtor') {
    const other = creditorName?.trim()
    if (settlement === 'received') return other ? `Pago · ${other}` : 'Pago'
    if (settlement === 'pending') return other ? `A pagar · ${other}` : 'A pagar'
    if (isHalfSplit(splitAmount, transactionAmount)) {
      return other ? `50/50 · ${other}` : '50/50'
    }
    return other
      ? `Valor · ${formatMoneyString(splitAmount)} · ${other}`
      : `Valor · ${formatMoneyString(splitAmount)}`
  }
  if (settlement === 'received') return `Recebido · ${splitWithName}`
  if (settlement === 'pending') return `A receber · ${splitWithName}`
  if (isHalfSplit(splitAmount, transactionAmount)) {
    return `50/50 · ${splitWithName}`
  }
  return `Valor · ${formatMoneyString(splitAmount)} · ${splitWithName}`
}

export function splitBadgeClassName(settlement?: SplitBadgeSettlement): string {
  if (settlement === 'received') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (settlement === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  return 'border-amber-200 bg-amber-50 text-amber-800'
}

export function partialSplitBadgeClassName(settlement?: SplitBadgeSettlement): string {
  if (settlement === 'received') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (settlement === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  return 'border-sky-200 bg-sky-50 text-sky-800'
}
