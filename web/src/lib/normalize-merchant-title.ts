/** Strip credit-card installment suffix; keep original casing. */
export function stripInstallmentSuffix(title: string): string {
  return title
    .replace(/\s*-\s*Parcela\s+\d+\/\d+/gi, '')
    .replace(/\s+Parcela\s+\d+\/\d+/gi, '')
    .trim()
}

/** Mirrors backend grouping for top-merchants reports. */
export function normalizeMerchantTitle(title: string): string {
  return stripInstallmentSuffix(title).toLowerCase()
}
