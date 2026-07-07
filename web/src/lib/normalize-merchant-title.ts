/** Mirrors backend grouping for top-merchants reports. */
export function normalizeMerchantTitle(title: string): string {
  return title
    .replace(/\s*-\s*Parcela \d+\/\d+/gi, '')
    .replace(/\s+Parcela \d+\/\d+/gi, '')
    .trim()
    .toLowerCase()
}
