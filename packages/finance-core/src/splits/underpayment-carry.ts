/**
 * When an installment is underpaid, close current at the paid total and add the
 * shortfall onto the next open parcel (nextAmount + shortfall).
 *
 * Returns null when payment is not a carry case (zero, full, or overpay).
 */
export type UnderpaymentCarryAllocation = {
  currentAmount: bigint
  currentPaidAmount: bigint
  shortfall: bigint
}

export function allocateUnderpaymentCarry(input: {
  currentAmount: bigint
  currentPaid: bigint
  payment: bigint
}): UnderpaymentCarryAllocation | null {
  const { currentAmount, currentPaid, payment } = input
  if (currentAmount <= 0n || payment <= 0n || currentPaid < 0n) return null

  const remaining = currentAmount - currentPaid
  if (remaining <= 0n || payment >= remaining) return null

  const currentPaidAmount = currentPaid + payment
  return {
    currentAmount: currentPaidAmount,
    currentPaidAmount,
    shortfall: remaining - payment,
  }
}

/** Next parcel amount after folding the unpaid remainder onto it. */
export function nextAmountAfterUnderpaymentCarry(
  nextAmount: bigint,
  shortfall: bigint
): bigint {
  const base = nextAmount > 0n ? nextAmount : 0n
  const add = shortfall > 0n ? shortfall : 0n
  return base + add
}
