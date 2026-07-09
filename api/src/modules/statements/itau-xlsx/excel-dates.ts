import { normalizeCell } from './types'

function excelSerialToIso(serial: number): string {
  const utcDays = Math.floor(serial - 25569)
  const date = new Date(utcDays * 86_400_000)
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
  ).toISOString()
}

export function parseExcelDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return excelSerialToIso(value)
  }

  const raw = normalizeCell(value)
  if (!raw) return null

  const asNumber = Number.parseFloat(raw)
  if (!Number.isNaN(asNumber) && /^\d+(\.\d+)?$/.test(raw)) {
    return excelSerialToIso(asNumber)
  }

  return null
}
