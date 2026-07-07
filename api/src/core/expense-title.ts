/** Strip installment suffix from credit card transaction titles. */
export function stripInstallmentBaseTitle(title: string): string {
  return title
    .replace(/\s*-\s*Parcela\s+\d+\/\d+/gi, '')
    .replace(/\s+Parcela\s+\d+\/\d+/gi, '')
    .trim()
}

/** Normalize expense title for grouping recurring merchants/items. */
export function normalizeExpenseTitle(title: string): string {
  return stripInstallmentBaseTitle(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** SQL expression fragment for PostgreSQL title normalization (matches normalizeExpenseTitle). */
export const expenseTitleNormalizeSql = (titleColumn: string) =>
  `LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(${titleColumn}, '\\\\s*-\\\\s*Parcela \\\\d+/\\\\d+', '', 'gi'), '\\\\s+Parcela \\\\d+/\\\\d+', '', 'gi')))`
