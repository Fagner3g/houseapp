/** Orchestrates bank settlement after optional split reimbursements. */

export type SplitPaymentMethod = 'pix' | 'cash' | 'transfer' | 'other'

export type SplitReimbursementChoice = {
  splitId: string
  /** null = unanswered; user must choose before confirming settlement. */
  reimbursed: boolean | null
  amountReais: number
  method: SplitPaymentMethod
}

export type RegisterSplitPaymentInput = {
  splitId: string
  amountReais: number
  method: SplitPaymentMethod
}

/**
 * Registers chosen split reimbursements first, then settles the bank transaction.
 * Choices with reimbursed≠true (or amount ≤ 0) are skipped — bank pay still runs.
 */
export async function runUnifiedSettlement(params: {
  reimbursements: SplitReimbursementChoice[]
  registerSplitPayment: (input: RegisterSplitPaymentInput) => Promise<void>
  payTransaction: () => Promise<void>
}): Promise<void> {
  for (const choice of params.reimbursements) {
    if (choice.reimbursed !== true || choice.amountReais <= 0) continue
    await params.registerSplitPayment({
      splitId: choice.splitId,
      amountReais: choice.amountReais,
      method: choice.method,
    })
  }
  await params.payTransaction()
}

export function allReimbursementChoicesAnswered(
  choices: SplitReimbursementChoice[]
): boolean {
  return choices.every(choice => choice.reimbursed !== null)
}

export function defaultReimbursementChoices(
  items: Array<{ splitId: string; remainingReais: number }>
): SplitReimbursementChoice[] {
  return items.map(item => ({
    splitId: item.splitId,
    reimbursed: null,
    amountReais: Math.max(0, item.remainingReais),
    method: 'pix' as const,
  }))
}
