/** Charge-mode labels for a split row (purchase vs partner collect). */
export function splitChargeModeBadge(input: {
  collectLumpSum?: boolean | null
  collectInstallmentsTotal?: number | null
  collectInstallmentNumber?: number | null
  purchaseInstallmentsTotal?: number | null
  purchaseInstallmentNumber?: number | null
}): { badge: string; caption: string } | null {
  if (input.collectLumpSum) {
    return { badge: 'à vista', caption: 'Cobrança à vista' }
  }

  if (
    input.collectInstallmentsTotal != null &&
    input.collectInstallmentsTotal >= 2 &&
    input.collectInstallmentNumber != null
  ) {
    return {
      badge: 'parcelado',
      caption: `Cobrança em ${input.collectInstallmentsTotal}× (${input.collectInstallmentNumber}/${input.collectInstallmentsTotal})`,
    }
  }

  if (
    input.purchaseInstallmentsTotal != null &&
    input.purchaseInstallmentsTotal > 1 &&
    input.purchaseInstallmentNumber != null
  ) {
    return {
      badge: 'parcelado',
      caption: `Valor desta parcela (${input.purchaseInstallmentNumber}/${input.purchaseInstallmentsTotal})`,
    }
  }

  return null
}
