const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return brFormatter.format(value)
}

/** Dense currency label for tight UI surfaces (calendar cells, chips). */
export function formatCompactCurrency(value: number): string {
  const compact = formatCurrency(value).replace(/\u00a0/g, ' ').replace(/\s/g, '')
  if (compact.endsWith(',00')) {
    return compact.slice(0, -3)
  }
  return compact
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

export function getRemainingAmount(totalReais: number, valuePaidCents: number): number {
  return Math.max(0, totalReais - valuePaidCents / 100)
}

/** Compact status fragment for calendar cells: "pago R$200 · falta R$356". */
export function formatPartialPaymentStatusCompact(
  totalReais: number,
  valuePaidCents: number
): string {
  const paidReais = valuePaidCents / 100
  const remainingReais = getRemainingAmount(totalReais, valuePaidCents)
  return `pago ${formatCompactCurrency(paidReais)} · falta ${formatCompactCurrency(remainingReais)}`
}

/** Tooltip / dialog copy: "Pagamento parcial: pago R$200 de R$556 · falta R$356". */
export function formatPartialPaymentDescription(
  totalReais: number,
  valuePaidCents: number
): string {
  const paidReais = valuePaidCents / 100
  const remainingReais = getRemainingAmount(totalReais, valuePaidCents)
  const paid = formatCurrency(paidReais)
  const total = formatCurrency(totalReais)
  const remaining = formatCurrency(remainingReais)
  return `Pagamento parcial: pago ${paid} de ${total} · falta ${remaining}`
}
