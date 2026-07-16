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

export function payInstallmentScopeExtrasTitle(hasOverdue: boolean): string {
  return hasOverdue ? 'Incluir também' : 'Adiantar também'
}

export function payInstallmentScopeExtrasHint(hasOverdue: boolean): string {
  return hasOverdue
    ? 'Vencidas anteriores ou parcelas seguintes — a atual permanece acima'
    : 'Acompanha o valor pago ou marque para somar'
}

export function advancePickerTitle(kind: SettlementKind): string {
  return kind === 'income'
    ? 'Selecione outras parcelas (recebimento)'
    : 'Selecione outras parcelas'
}

export function advancePickerHint(kind: SettlementKind): string {
  return kind === 'income'
    ? 'Opcional: vencidas anteriores ou adiantamentos. A parcela atual fica no valor acima.'
    : 'Opcional: vencidas anteriores ou adiantamentos. A parcela atual fica no valor acima.'
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
