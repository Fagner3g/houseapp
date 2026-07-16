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

export function splitPaymentPayBannerHint(): string {
  return 'Na quitação você pode marcar se a pessoa já te reembolsou.'
}
