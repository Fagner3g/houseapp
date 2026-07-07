import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseNubankCsv } from './nubank-csv-parser'

const SAMPLE_CSV = `date,title,amount
2026-07-02,Marcio Parafusos,"26,00"
2026-07-01,iFood - NuPay,"0,90"
2026-07-01,iFood - NuPay,"- 0,90"
2026-06-18,Lojas Renner Fl - Parcela 1/3,"73,28"
2026-06-08,Pagamento recebido,"- 4.456,61"
2026-06-01,Reversão do Crédito de confiança de Vantagens.Cvolta.Com,"27,00"
2026-06-02,IOF de volta de Cursor Ai Powered Ide,"- 1,88"
`

describe('parseNubankCsv', () => {
  it('parses Nubank CSV transactions and infers totals', () => {
    const result = parseNubankCsv({
      content: SAMPLE_CSV,
      fileName: 'Nubank_2026-07-17.csv',
      closingDay: 1,
      dueDay: 8,
    })

    expect(result.transactionsCount).toBe(7)
    expect(result.parsed.transactions[0]?.title).toBe('Marcio Parafusos')
    expect(result.parsed.transactions[0]?.externalId).toHaveLength(64)
    expect(result.parsed.transactions[3]?.installmentNumber).toBe(1)
    expect(result.parsed.transactions[3]?.installmentsTotal).toBe(3)
    expect(result.parsed.transactions[4]?.type).toBe('income')
    expect(result.parsed.transactions[5]?.type).toBe('income')
    expect(result.parsed.transactions[6]?.type).toBe('income')
    expect(Number.parseFloat(result.parsed.totalAmount)).toBe(-4386.21)
    expect(result.parsed.fileHash).toHaveLength(64)
    expect(result.parsed.isClosed).toBe(false)
    expect(result.parsed.isPaid).toBe(false)
    expect(result.parsed.importSource).toBe('csv')
  })

  it('parses the Nubank open-invoice CSV fixture', () => {
    const samplePath = resolve(import.meta.dirname, 'fixtures/nubank-2026-07-17.csv')
    const content = readFileSync(samplePath, 'utf8')

    const result = parseNubankCsv({
      content,
      fileName: 'Nubank_2026-07-17.csv',
      closingDay: 1,
      dueDay: 8,
    })

    expect(result.transactionsCount).toBe(73)
    expect(result.parsed.transactions.some(item => item.title.includes('Pagamento recebido'))).toBe(
      true
    )
  })
})
