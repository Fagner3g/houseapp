const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return brFormatter.format(value)
}

/** Parses masked pt-BR currency input (digits only) into a decimal number. */
export function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  return Number(digits) / 100
}

export function numberToCents(value: number): number {
  return Math.round(value * 100)
}

export function centsToNumber(cents: number): number {
  return cents / 100
}
