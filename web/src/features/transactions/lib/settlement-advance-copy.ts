/** Copy for installment advance / underpayment carry UI. */

import { formatCurrency } from '@/lib/currency'

import type { SettlementKind } from './settlement-copy'

export function payInstallmentScopeCurrentHint(
  kind: SettlementKind,
  alreadySettled: boolean,
  amountLabel: string
): string {
  if (alreadySettled) {
    return kind === 'income'
      ? `Esta parcela (${amountLabel}) já está recebida — só confirma o status`
      : `Esta parcela (${amountLabel}) já está quitada — só confirma o status`
  }
  return `Registra ${amountLabel} nesta parcela`
}

export function payInstallmentScopeAllLabel(_kind: SettlementKind): string {
  return 'Selecionar todas'
}

export function advancePickerTitle(kind: SettlementKind): string {
  return kind === 'income'
    ? 'Selecione as parcelas a adiantar (recebimento)'
    : 'Selecione as parcelas a adiantar'
}

export function advancePickerHint(kind: SettlementKind): string {
  return kind === 'income'
    ? 'Opcional: marcar preenche o valor com o saldo das parcelas escolhidas.'
    : 'Opcional: marcar preenche o valor com o saldo das parcelas escolhidas.'
}

export function advancePickerAmountMismatch(
  kind: SettlementKind,
  amountLabel: string
): string {
  return kind === 'income'
    ? `O valor recebido (${amountLabel}) não precisa fechar exatamente com a seleção.`
    : `O valor pago (${amountLabel}) não precisa fechar exatamente com a seleção.`
}

/** Preview when underpayment folds the remainder onto the next parcel. */
export function underpaymentCarryHint(
  kind: SettlementKind,
  paymentReais: number,
  remainingReais: number,
  nextInstallmentNumber: number,
  nextInstallmentAmountReais: number
): string | null {
  if (!(paymentReais > 0) || !(remainingReais > paymentReais)) return null

  const shortfall = remainingReais - paymentReais
  const nextTotal = nextInstallmentAmountReais + shortfall
  const paymentLabel = formatCurrency(paymentReais)
  const remainingLabel = formatCurrency(remainingReais)
  const nextTotalLabel = formatCurrency(nextTotal)

  return kind === 'income'
    ? `Recebendo ${paymentLabel} de ${remainingLabel}: o restante soma na parcela ${nextInstallmentNumber} (passa a ${nextTotalLabel})`
    : `Pagando ${paymentLabel} de ${remainingLabel}: o restante soma na parcela ${nextInstallmentNumber} (passa a ${nextTotalLabel})`
}
