export type ParsedLineTransaction = {
  title: string
  amount: string
  date: string
  type: 'income' | 'expense'
  installmentNumber?: number
  installmentsTotal?: number
  externalId?: string
  /** Legacy OFX hashes (date-in-fingerprint) used only for reimport matching. */
  alternateExternalIds?: string[]
  cardLastFour?: string
}

export function toIsoDateFromYmd(date: string): string {
  const parts = date.split('-').map(part => Number.parseInt(part, 10))
  const year = parts[0] as number
  const month = parts[1] as number
  const day = parts[2] as number
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString()
}
