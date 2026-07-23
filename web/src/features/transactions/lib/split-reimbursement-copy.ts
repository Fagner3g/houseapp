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

export function markSplitReceivedDialogTitle(): string {
  return 'Registrar recebimento'
}

export function markSplitReceivedDialogDescription(personName: string): string {
  return `Informe quanto ${personName} pagou. Valor parcial mantém a divisão em aberto com o saldo restante.`
}

export function markSplitReceivedAmountLabel(): string {
  return 'Valor recebido'
}

export function markSplitReceivedRemainingHint(remainingLabel: string): string {
  return `Em aberto: ${remainingLabel}`
}

export function markSplitReceivedConfirmLabel(): string {
  return 'Registrar'
}

export function markSplitReceivedDismissLabel(): string {
  return 'Cancelar'
}

export function markSplitReceivedSuccessToast(isPartial: boolean): string {
  return isPartial ? 'Pagamento parcial registrado' : 'Recebimento registrado'
}

export function cancelSplitPaymentDialogTitle(): string {
  return 'Desfazer pagamento'
}

export function cancelSplitPaymentDialogDescription(): string {
  return 'A divisão voltará para pendente e você poderá registrar o recebimento de novo.'
}

export function cancelSplitPaymentDialogDismissLabel(): string {
  return 'Manter'
}

export function cancelSplitPaymentDialogConfirmLabel(): string {
  return 'Desfazer pagamento'
}

export function cancelSplitPaymentActionLabel(): string {
  return 'Desfazer'
}

export function splitPaymentPayBannerHint(): string {
  return 'Em Divisões, use “Marcar como paga” quando a pessoa te reembolsar.'
}
