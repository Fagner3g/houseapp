const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return brFormatter.format(value)
}

export function centsToReais(cents: number): number {
  return cents / 100
}

/**
 * API money strings use decimal reais (e.g. "6983.61" from centavosToString).
 * Internal UI centavos use integer strings without decimals (e.g. "1700" = R$17).
 *
 * Integer strings without a decimal are ambiguous:
 * - "90000" → centavos (R$900)
 * - "900"   → reais with missing decimals (R$900), NOT R$9
 */
export function moneyStringToCents(value: string | null | undefined): number {
  if (!value) return 0
  const trimmed = value.trim()
  if (!trimmed) return 0

  if (trimmed.includes('.')) {
    const [integerPart, fractionalPart = ''] = trimmed.split('.')
    const cents = (fractionalPart + '00').slice(0, 2)
    return Number(integerPart) * 100 + Number(cents)
  }

  const asInteger = Number(trimmed)
  if (!Number.isFinite(asInteger)) return 0

  // 4+ digits or >= 1000: internal centavos integer (e.g. "1700", "90000")
  if (trimmed.length >= 4 || asInteger >= 1000) {
    return asInteger
  }

  // 3-digit whole numbers (100–999): reais without decimal (e.g. "900" = R$900)
  if (asInteger >= 100) {
    return asInteger * 100
  }

  // Smaller values: centavos (e.g. "50" = R$0,50)
  return asInteger
}

export function moneyStringToReais(value: string | null | undefined): number {
  return centsToReais(moneyStringToCents(value))
}

/** Avoids float drift when summing or subtracting money values. */
export function reaisToCents(value: number): number {
  return moneyStringToCents(value.toFixed(2))
}

/** Formats money strings from the API or internal centavos integers. */
export function formatCentsString(value: string | null | undefined): string {
  return formatCurrency(moneyStringToReais(value))
}

/** @deprecated Prefer moneyStringToReais — kept for call-site compatibility. */
export function centsStringToNumber(value: string | null | undefined): number {
  return moneyStringToReais(value)
}

/** Formats API money strings (decimal reais). */
export function formatMoneyString(value: string | null | undefined): string {
  return formatCentsString(value)
}

export function moneyStringToNumber(value: string | null | undefined): number {
  return moneyStringToReais(value)
}

/** Integer centavos string for internal UI state (import review, splits). */
export function reaisToCentsString(reais: number): string {
  return String(Math.round(reais * 100))
}

/** Decimal reais string for API request bodies (parseCentavos). */
export function reaisToMoneyString(reais: number): string {
  return reais.toFixed(2)
}

/** API amount when known; `null` for reminder-without-value (empty / zero form). */
export function optionalReaisToApiAmount(reais: number | null | undefined): string | null {
  if (reais == null || !Number.isFinite(reais) || reais <= 0) return null
  return reaisToMoneyString(reais)
}

/** Form amount for CurrencyInput `allowEmpty`: null when API amount is missing or zero. */
export function apiAmountToFormReais(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const reais = moneyStringToReais(value)
  return reais > 0 ? reais : null
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
  return reaisToCents(value)
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
