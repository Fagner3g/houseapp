/** UI copy for paying an expense vs receiving income. */

import { formatCurrency } from '@/lib/currency'

export type SettlementKind = 'income' | 'expense'

export function settlementKindFromType(
  type: string | null | undefined
): SettlementKind {
  return type === 'income' ? 'income' : 'expense'
}

export function settledToggleLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Recebido' : 'Pago'
}

export function amountToSettleLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Valor a receber' : 'Valor a pagar'
}

/** Bank/account settlement amount (distinct from person reimbursement). */
export function amountToSettleAccountLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Valor na conta' : 'Valor da conta'
}

export function settledAmountLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Valor recebido' : 'Valor pago'
}

export function settlementDateLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Data do recebimento' : 'Data do pagamento'
}

export function alreadySettledFragment(kind: SettlementKind): string {
  return kind === 'income' ? 'Já recebido' : 'Já pago'
}

/** Hint under payment fields for the current installment — never says "parcial" when remaining is 0. */
export function installmentSettlementHint(
  kind: SettlementKind,
  remainingReais: number,
  paidReais: number
): string | null {
  if (paidReais <= 0 && remainingReais <= 0) return null

  const paidFragment = `${alreadySettledFragment(kind)} ${formatCurrency(paidReais)}`

  if (remainingReais <= 0) {
    return `${paidFragment} · esta parcela está quitada`
  }

  if (paidReais <= 0) return null

  return `${partialSettlementLabel(kind)} · falta ${formatCurrency(remainingReais)} · ${paidFragment}`
}

export function partialSettlementLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Recebimento parcial' : 'Pagamento parcial'
}

export function installmentSettlementScopeNote(
  kind: SettlementKind,
  installmentNumber: number,
  installmentsTotal: number,
  remainingReais = Number.POSITIVE_INFINITY
): string {
  if (remainingReais <= 0) {
    return kind === 'income'
      ? `Esta parcela (${installmentNumber} de ${installmentsTotal}) já está recebida; as demais podem ser adiantadas.`
      : `Esta parcela (${installmentNumber} de ${installmentsTotal}) já está quitada; as demais podem ser adiantadas.`
  }

  const verb =
    kind === 'income'
      ? 'O recebimento será registrado'
      : 'O pagamento será registrado'
  return `${verb} apenas nesta parcela (${installmentNumber} de ${installmentsTotal}).`
}

export function payInstallmentScopeTitle(kind: SettlementKind): string {
  return kind === 'income' ? 'Receber na conta' : 'Pagar na conta'
}

export function payInstallmentScopeDescription(
  kind: SettlementKind,
  options?: { withSplits?: boolean }
): string {
  if (options?.withSplits) {
    return kind === 'income'
      ? 'Informe o valor na conta. Responda o reembolso abaixo; adiantar é opcional.'
      : 'Informe o valor na conta. Responda o reembolso abaixo; adiantar é opcional.'
  }
  return kind === 'income'
    ? 'Informe o valor. Você pode receber parcial ou adiantar outras parcelas.'
    : 'Informe o valor. Você pode pagar parcial ou adiantar outras parcelas.'
}

export function payInstallmentScopeConfirmLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'
}

export function registerSettlementButtonLabel(
  kind: SettlementKind,
  options?: { withSplits?: boolean }
): string {
  if (options?.withSplits) {
    return 'Registrar quitação'
  }
  return kind === 'income' ? 'Receber na conta' : 'Pagar na conta'
}

export function scheduleSettlementButtonLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Agendar recebimento' : 'Agendar pagamento'
}

export function cancelSettlementLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'Cancelar recebimento' : 'Cancelar pagamento'
}