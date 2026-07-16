import { formatCurrency } from '@/lib/currency'

import type { SettlementKind } from './settlement-copy'

export function amountFieldValidationLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'valor recebido' : 'valor pago'
}

export function dateFieldValidationLabel(kind: SettlementKind): string {
  return kind === 'income' ? 'data do recebimento' : 'data do pagamento'
}

export function settlementRegisteredToast(
  kind: SettlementKind,
  withAdvance: boolean
): string {
  if (kind === 'income') {
    return withAdvance
      ? 'Recebimento registrado com adiantamento de parcelas'
      : 'Recebimento registrado'
  }
  return withAdvance
    ? 'Pagamento registrado com adiantamento de parcelas'
    : 'Pagamento registrado'
}

export function installmentConfirmedToast(kind: SettlementKind): string {
  return kind === 'income'
    ? 'Parcela confirmada como recebida'
    : 'Parcela confirmada como paga'
}

export function enterAmountToast(kind: SettlementKind): string {
  return kind === 'income' ? 'Informe o valor recebido' : 'Informe o valor pago'
}

export function amountMustMatchSelectionToast(kind: SettlementKind): string {
  return kind === 'income'
    ? 'Selecione parcelas que fechem exatamente com o valor recebido'
    : 'Selecione parcelas que fechem exatamente com o valor pago'
}

export function underpaymentCarryToast(
  kind: SettlementKind,
  paymentReais: number,
  shortfallReais: number,
  nextInstallmentNumber: number,
  nextTotalReais: number
): string {
  const paymentLabel = formatCurrency(paymentReais)
  const nextTotalLabel = formatCurrency(nextTotalReais)
  const shortfallLabel = formatCurrency(shortfallReais)
  return kind === 'income'
    ? `Recebido ${paymentLabel} · ${shortfallLabel} somados na parcela ${nextInstallmentNumber} (agora ${nextTotalLabel})`
    : `Pago ${paymentLabel} · ${shortfallLabel} somados na parcela ${nextInstallmentNumber} (agora ${nextTotalLabel})`
}

export function advancePromptTitle(kind: SettlementKind): string {
  return kind === 'income' ? 'Adiantar recebimentos?' : 'Adiantar parcelas?'
}

export function advancePromptDescription(kind: SettlementKind): string {
  return kind === 'income'
    ? 'O valor informado é maior que o saldo desta parcela. Deseja adiantar outras parcelas da mesma receita?'
    : 'O valor informado é maior que o saldo desta parcela. Deseja adiantar outras parcelas da mesma compra?'
}
