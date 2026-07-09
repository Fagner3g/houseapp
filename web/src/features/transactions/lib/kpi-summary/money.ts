import { moneyStringToCents } from '@/lib/currency'

/** Remaining split balance in centavos (non-negative). */
export function remainingSplitCents(amount: string, paidAmount: string): number {
  return Math.max(0, moneyStringToCents(amount) - moneyStringToCents(paidAmount))
}
