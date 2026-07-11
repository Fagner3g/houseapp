import { divideCentavos } from '../money/centavos'

/**
 * Scales a partial installment-series total up to the full purchase when only
 * some parcels are materialized (e.g. imported statement with parcel 1 of N).
 */
export function extrapolateInstallmentSeriesTotalCentavos(
  materializedTotalCentavos: bigint,
  materializedInstallmentCount: number,
  installmentsTotal: number | null
): bigint {
  if (
    installmentsTotal == null ||
    installmentsTotal < 2 ||
    materializedInstallmentCount <= 0 ||
    materializedInstallmentCount >= installmentsTotal
  ) {
    return materializedTotalCentavos
  }

  return (
    (materializedTotalCentavos * BigInt(installmentsTotal)) / BigInt(materializedInstallmentCount)
  )
}

/**
 * Bank statement imports store one installment amount per row. When only a
 * subset of parcels exists yet, debt totals should be extrapolated across
 * installmentsTotal so a 50% split on parcel 1 reflects the full purchase share.
 */
export function shouldExtrapolateInstallmentSplitTotals(input: {
  isImportedStatement: boolean
  siblingCount: number
  materializedInstallmentSplitCount: number
  installmentsTotal: number | null
  /** Full share collected once on this parcel — never scale across installments. */
  collectLumpSum?: boolean
}): boolean {
  const {
    isImportedStatement,
    siblingCount,
    materializedInstallmentSplitCount,
    installmentsTotal,
    collectLumpSum,
  } = input

  if (collectLumpSum) return false
  if (installmentsTotal == null || installmentsTotal < 2) return false
  if (materializedInstallmentSplitCount >= installmentsTotal) return false
  if (siblingCount >= installmentsTotal) return false
  return isImportedStatement
}

/**
 * Resolves how much of a person's share falls on the current installment.
 *
 * - Multiple split rows (one per parcel) → use the row amount as-is.
 * - Lump-sum collection on one parcel → use the row amount as-is (full share due once).
 * - Single split covering the full debt on a parceled purchase → divide evenly.
 */
export function resolvePersonShareInstallmentAmountCentavos(input: {
  totalOwedCentavos: bigint
  installmentsTotal: number | null
  installmentNumber: number | null
  currentSplitAmountCentavos: bigint
  materializedInstallmentSplits: number
  collectLumpSum?: boolean
}): bigint {
  const {
    totalOwedCentavos,
    installmentsTotal,
    installmentNumber,
    currentSplitAmountCentavos,
    materializedInstallmentSplits,
    collectLumpSum,
  } = input

  if (collectLumpSum) {
    return currentSplitAmountCentavos
  }

  if (installmentsTotal == null || installmentsTotal < 2 || totalOwedCentavos <= 0n) {
    return currentSplitAmountCentavos
  }

  if (materializedInstallmentSplits > 1) {
    return currentSplitAmountCentavos
  }

  const sharePerInstallment = divideCentavos(totalOwedCentavos, installmentsTotal)
  const index = Math.max(0, (installmentNumber ?? 1) - 1)
  return sharePerInstallment[index] ?? currentSplitAmountCentavos
}
