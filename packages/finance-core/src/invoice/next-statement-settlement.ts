import { parseMoneyStringToCentavos } from '../money/strings'

/**
 * Nubank (and similar) OFX for the next cycle reports previousBalance = 0 when the
 * prior invoice was paid in full — often without a bill-payment line on that file.
 */
export function isPriorInvoiceSettledByNextBalance(
  nextPreviousBalance: string | null | undefined
): boolean {
  if (nextPreviousBalance == null || nextPreviousBalance === '') return false
  return parseMoneyStringToCentavos(nextPreviousBalance) <= 0n
}
