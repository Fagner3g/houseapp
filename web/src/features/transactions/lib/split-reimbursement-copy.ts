/** pt-BR copy for interpersonal reimbursement (distinct from bank Quitação). */

export function reimbursementStepTitle(): string {
  return 'Reembolso das divisões'
}

export function reimbursementPersonQuestion(personName: string): string {
  return `${personName} já te reembolsou?`
}

export function reimbursementReceivedLabel(personName: string): string {
  return `Recebi de ${personName}`
}

/** Creditor action on a pending split row (outside bank settlement). */
export function markSplitReceivedLabel(): string {
  return 'Marcar como paga'
}

export function cancelSplitPaymentDialogTitle(): string {
  return 'Cancelar pagamento'
}

export function cancelSplitPaymentDialogDescription(): string {
  return 'A divisão voltará para pendente e você poderá registrar o recebimento de novo.'
}

export function cancelSplitPaymentDialogConfirmLabel(): string {
  return 'Sim, cancelar'
}

export function splitPaymentPayBannerHint(): string {
  return 'Em Divisões, use “Marcar como paga” quando a pessoa te reembolsar.'
}
