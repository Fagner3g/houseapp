const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
}

export type ParsedLineTransaction = {
  title: string
  amount: string
  date: string
  type: 'income' | 'expense'
  installmentNumber?: number
  installmentsTotal?: number
  externalId?: string
}

function parseBrazilianAmount(raw: string): string {
  const cleaned = raw.replace(/\./g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  return Number.isNaN(value) ? '0.00' : Math.abs(value).toFixed(2)
}

function toIsoDate(day: number, month: number, year: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString()
}

function parseInstallment(title: string): { installmentNumber?: number; installmentsTotal?: number } {
  const match = title.match(/Parcela\s+(\d+)\/(\d+)/i)
  if (!match) return {}
  return {
    installmentNumber: Number.parseInt(match[1]!, 10),
    installmentsTotal: Number.parseInt(match[2]!, 10),
  }
}

function isPaymentLine(title: string, amountRaw: string, hasMinus: boolean): boolean {
  if (hasMinus) return true
  return /pagamento/i.test(title) || /crédito de confiança/i.test(title)
}

const TRANSACTION_LINE_PATTERN =
  /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.+?)\s+(−|-)?R\$\s*([\d.]+,\d{2})\s*$/i

function parseTransactionLine(line: string, year: number): ParsedLineTransaction | null {
  const match = line.trim().match(TRANSACTION_LINE_PATTERN)
  if (!match) return null

  const day = Number.parseInt(match[1]!, 10)
  const monthToken = match[2]!.toUpperCase()
  const month = MONTH_MAP[monthToken]
  if (!month) return null

  let title = match[3]!.trim().replace(/^\d{2}\s+[A-Z]{3}\s+/i, '')
  if (/^(a|de|em)$/i.test(title) || /limite total|período vigente|fatura anterior/i.test(title)) {
    return null
  }

  const hasMinus = match[4] === '−' || match[4] === '-'
  const amount = parseBrazilianAmount(match[5]!)
  const isIncome = isPaymentLine(title, match[5]!, hasMinus)

  return {
    title,
    amount,
    date: toIsoDate(day, month, year),
    type: isIncome ? 'income' : 'expense',
    ...parseInstallment(title),
  }
}

export function parseNubankTransactionsFromText(
  text: string,
  year = 2026
): ParsedLineTransaction[] {
  const transactions: ParsedLineTransaction[] = []
  const sectionMarker = /TRANSAÇÕES DE\s+\d{2}\s+[A-Z]{3}\s+A\s+\d{2}\s+[A-Z]{3}/i
  const sectionMatch = text.match(sectionMarker)
  const searchableText =
    sectionMatch?.index != null
      ? text.slice(sectionMatch.index + sectionMatch[0].length)
      : text

  for (const line of searchableText.split(/\r?\n/)) {
    const parsed = parseTransactionLine(line, year)
    if (parsed) {
      transactions.push(parsed)
    }
  }

  return transactions
}

export function parseNubankMetadataFromText(text: string) {
  const totalMatch = text.match(/Total a pagar\s+R\$\s*([\d.]+,\d{2})/i)
  const minimumMatch = text.match(/Pagamento mínimo(?:\s+para não ficar em atraso)?\s+R\$\s*([\d.]+,\d{2})/i)
  const dueMatch = text.match(/Data de vencimento:\s*(\d{2})\s+([A-Z]{3})\s+(\d{4})/i)
  const invoiceDueMatch = text.match(/\bFATURA\s+(\d{2})\s+([A-Z]{3})\s+(\d{4})/i)
  const periodMatch = text.match(/Período vigente:\s*(\d{2})\s+([A-Z]{3})\s+a\s+(\d{2})\s+([A-Z]{3})/i)
  const closingMatch = text.match(/EMISSÃO E ENVIO\s+(\d{2})\s+([A-Z]{3})\s+(\d{4})/i)
  const previousMatch = text.match(/Fatura anterior\s+R\$\s*([\d.]+,\d{2})/i)
  const paymentsMatch = text.match(/Pagamento recebido\s+[−-]?R\$\s*([\d.]+,\d{2})/i)
  const purchasesMatch = text.match(
    /Total de compras de todos os cartões,\s*\d{2}\s+[A-Z]{3}\s+a\s+\d{2}\s+[A-Z]{3}\s+R\$\s*([\d.]+,\d{2})/i
  )
  const otherMatch = text.match(/Outros lançamentos\s+R\$\s*([\d.]+,\d{2})/i)
  const nextInvoiceMatch = text.match(/Saldo em aberto da próxima fatura\s+R\$\s*([\d.]+,\d{2})/i)
  const totalOpenMatch = text.match(/Saldo em aberto total\s+R\$\s*([\d.]+,\d{2})/i)

  const resolveDate = (day: string, monthToken: string, year: string) => {
    const month = MONTH_MAP[monthToken.toUpperCase()]
    if (!month) return null
    return toIsoDate(Number.parseInt(day, 10), month, Number.parseInt(year, 10))
  }

  const dueDate = dueMatch
    ? resolveDate(dueMatch[1]!, dueMatch[2]!, dueMatch[3]!)
    : invoiceDueMatch
      ? resolveDate(invoiceDueMatch[1]!, invoiceDueMatch[2]!, invoiceDueMatch[3]!)
      : null
  const periodStart = periodMatch
    ? resolveDate(periodMatch[1]!, periodMatch[2]!, dueMatch?.[3] ?? '2026')
    : null
  const periodEnd = periodMatch
    ? resolveDate(periodMatch[3]!, periodMatch[4]!, dueMatch?.[3] ?? '2026')
    : null
  const closingDate = closingMatch
    ? resolveDate(closingMatch[1]!, closingMatch[2]!, closingMatch[3]!)
    : periodEnd

  return {
    totalAmount: totalMatch ? parseBrazilianAmount(totalMatch[1]!) : null,
    minimumPayment: minimumMatch ? parseBrazilianAmount(minimumMatch[1]!) : null,
    previousBalance: previousMatch ? parseBrazilianAmount(previousMatch[1]!) : null,
    paymentsReceived: paymentsMatch ? parseBrazilianAmount(paymentsMatch[1]!) : null,
    purchasesTotal: purchasesMatch ? parseBrazilianAmount(purchasesMatch[1]!) : null,
    otherCharges: otherMatch ? parseBrazilianAmount(otherMatch[1]!) : null,
    nextInvoiceBalance: nextInvoiceMatch ? parseBrazilianAmount(nextInvoiceMatch[1]!) : null,
    totalOpenBalance: totalOpenMatch ? parseBrazilianAmount(totalOpenMatch[1]!) : null,
    periodStart,
    periodEnd,
    closingDate,
    dueDate,
  }
}
