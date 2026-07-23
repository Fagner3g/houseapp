/** Preview steps for free-amount installment settlement in the scope dialog. */

import { allocateOverpaymentWaterfall } from '@houseapp/finance-core'

import { formatCurrency } from '@/lib/currency'

export type AllocationPreviewParcel = {
  id: string
  installmentNumber: number
  remainingReais: number
}

export type AllocationPreviewStep = {
  id: string
  installmentNumber: number
  applyReais: number
  status: 'paid' | 'partial' | 'untouched'
  remainingAfterReais: number
}

function toCentavos(reais: number): bigint {
  return BigInt(Math.round(reais * 100))
}

function toReais(centavos: bigint): number {
  return Number(centavos) / 100
}

/**
 * Builds a line-by-line preview of how `paymentReais` lands across parcels.
 * When payment fits the first parcel only, returns a single paid/partial step.
 */
export function buildPaymentAllocationPreview(
  paymentReais: number,
  parcels: AllocationPreviewParcel[]
): AllocationPreviewStep[] {
  if (paymentReais <= 0 || parcels.length === 0) return []

  const payment = toCentavos(paymentReais)
  const kernelParcels = parcels.map(p => ({
    id: p.id,
    remaining: toCentavos(Math.max(0, p.remainingReais)),
  }))

  const first = parcels[0]
  const firstRemaining = first ? Math.max(0, first.remainingReais) : 0

  if (paymentReais <= firstRemaining + 0.005) {
    if (!first) return []
    const apply = Math.min(paymentReais, firstRemaining)
    const status: 'paid' | 'partial' =
      apply >= firstRemaining - 0.005 ? 'paid' : 'partial'
    return [
      {
        id: first.id,
        installmentNumber: first.installmentNumber,
        applyReais: apply,
        status,
        remainingAfterReais: Math.max(0, firstRemaining - apply),
      },
    ]
  }

  const waterfall = allocateOverpaymentWaterfall({
    payment,
    parcels: kernelParcels,
  })

  if (!waterfall) return []

  const byId = new Map(parcels.map(p => [p.id, p]))
  return waterfall.map(step => {
    const parcel = byId.get(step.id)
    const remaining = parcel ? Math.max(0, parcel.remainingReais) : 0
    const applyReais = toReais(step.apply)
    return {
      id: step.id,
      installmentNumber: parcel?.installmentNumber ?? 0,
      applyReais,
      status: step.status,
      remainingAfterReais: Math.max(0, remaining - applyReais),
    }
  })
}

export function formatAllocationPreviewLine(
  step: AllocationPreviewStep,
  kind: 'income' | 'expense'
): string {
  const amount = formatCurrency(step.applyReais)
  if (step.status === 'paid') {
    return kind === 'income'
      ? `Parcela ${step.installmentNumber} · ${amount} · recebida`
      : `Parcela ${step.installmentNumber} · ${amount} · quitada`
  }
  return kind === 'income'
    ? `Parcela ${step.installmentNumber} · ${amount} · parcial (falta ${formatCurrency(step.remainingAfterReais)})`
    : `Parcela ${step.installmentNumber} · ${amount} · parcial (falta ${formatCurrency(step.remainingAfterReais)})`
}

/** Extra parcel ids touched by the payment (not the current parcel). */
export function advanceIdsCoveredByPreview(
  preview: AllocationPreviewStep[],
  currentInstallmentNumber: number
): string[] {
  return preview
    .filter(
      step =>
        step.installmentNumber !== currentInstallmentNumber &&
        (step.status === 'paid' || step.status === 'partial') &&
        step.id !== '__current__'
    )
    .map(step => step.id)
}
