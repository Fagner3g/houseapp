import { parseCentavos } from './money.ts'

/** Parses API decimal strings and ambiguous UI integer strings into centavos. */
export function parseMoneyStringToCentavos(value: string | null | undefined): bigint {
  if (!value) return 0n
  const trimmed = value.trim()
  if (!trimmed) return 0n

  if (trimmed.includes('.')) {
    return parseCentavos(trimmed)
  }

  const asInteger = Number(trimmed)
  if (!Number.isFinite(asInteger)) return 0n

  if (trimmed.length >= 4 || asInteger >= 1000) {
    return BigInt(asInteger)
  }

  if (asInteger >= 100) {
    return BigInt(asInteger) * 100n
  }

  return BigInt(asInteger)
}

export function centavosToReaisNumber(centavos: bigint): number {
  return Number(centavos) / 100
}

export function reaisNumberToCentavos(reais: number): bigint {
  return BigInt(Math.round(reais * 100))
}

export function maxCentavos(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}
