import { FinanceValidationError } from './errors'

const CENTAVOS_PATTERN = /^-?\d+(\.\d{1,2})?$/

export function parseCentavos(input: string): bigint {
  const value = input.trim()

  if (!CENTAVOS_PATTERN.test(value)) {
    throw new FinanceValidationError(
      'Valor inválido: use string decimal com ponto (ex.: "1234.56") e no máximo 2 casas'
    )
  }

  const [integerPart, fractionalPart = ''] = value.split('.')
  const cents = (fractionalPart + '00').slice(0, 2)

  return BigInt(integerPart) * 100n + BigInt(cents)
}

export function formatCentavos(centavos: bigint): string {
  const sign = centavos < 0n ? '-' : ''
  const absolute = centavos < 0n ? -centavos : centavos
  const integer = absolute / 100n
  const fraction = (absolute % 100n).toString().padStart(2, '0')

  return `${sign}${integer.toString()}.${fraction}`
}

export function centavosToString(centavos: bigint | null | undefined): string | null {
  if (centavos == null) return null
  return formatCentavos(centavos)
}

/** Splits total centavos into N parts; distributes remainder to the first installments. */
export function divideCentavos(total: bigint, parts: number): bigint[] {
  if (parts < 1) {
    throw new FinanceValidationError('Número de parcelas inválido')
  }

  const count = BigInt(parts)
  const base = total / count
  let remainder = total % count
  const amounts: bigint[] = []

  for (let i = 0; i < parts; i++) {
    const extra = remainder > 0n ? 1n : 0n
    if (remainder > 0n) remainder -= 1n
    amounts.push(base + extra)
  }

  return amounts
}
