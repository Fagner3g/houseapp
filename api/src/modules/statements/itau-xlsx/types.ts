export type SheetRow = Array<string | number | boolean | null | undefined>

export function normalizeCell(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

export function findRowIndexWithCell(
  rows: SheetRow[],
  matcher: (value: string) => boolean
): number {
  return rows.findIndex(row => row.some(cell => matcher(normalizeCell(cell))))
}

export function findCellInRow(
  row: SheetRow,
  matcher: (value: string) => boolean
): string | null {
  for (const cell of row) {
    const value = normalizeCell(cell)
    if (value && matcher(value)) return value
  }
  return null
}

export function findCellIndex(row: SheetRow, label: string): number {
  return row.findIndex(cell => normalizeCell(cell) === label)
}

export function findAmountColumnIndex(row: SheetRow): number {
  const partialColumn = findCellIndex(row, 'Valor (parcial)')
  if (partialColumn >= 0) return partialColumn

  return findCellIndex(row, 'Valor')
}

export type TransactionColumnMap = {
  date: number
  title: number
  installment: number
  amount: number
  cardNumber: number
}

export function rowHasLabel(row: SheetRow, label: string): boolean {
  return row.some(cell => normalizeCell(cell) === label)
}
