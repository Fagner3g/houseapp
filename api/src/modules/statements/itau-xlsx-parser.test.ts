import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parseItauXlsx } from './itau-xlsx'

const fixturesDir = resolve(__dirname, 'fixtures')

describe('parseItauXlsx', () => {
  it('parses June 2026 fatura paga with installments and payment', () => {
    const buffer = readFileSync(resolve(fixturesDir, 'itau-fatura-paga-4368-junho2026.xlsx'))

    const result = parseItauXlsx({
      buffer,
      fileName: 'fatura-paga-final 4368-junho2026.xlsx',
      closingDay: 1,
      dueDay: 8,
    })

    expect(result.cardLastFour).toBe('4368')
    expect(result.parsed.importSource).toBe('xlsx')
    expect(result.parsed.isClosed).toBe(true)
    expect(result.parsed.isPaid).toBe(true)
    expect(result.parsed.totalAmount).toBe('655.84')
    expect(result.parsed.dueDate).toBe('2026-06-17T12:00:00.000Z')
    expect(result.transactionsCount).toBe(3)

    const payment = result.parsed.transactions.find(tx => tx.title === 'Pagamento Efetuado')
    expect(payment?.type).toBe('income')
    expect(payment?.amount).toBe('717.83')

    const installment = result.parsed.transactions.find(tx => tx.title.includes('Laser Rosa'))
    expect(installment?.type).toBe('expense')
    expect(installment?.installmentNumber).toBe(4)
    expect(installment?.installmentsTotal).toBe(4)
    expect(installment?.cardLastFour).toBe('4368')
    expect(installment?.externalId).toHaveLength(64)
  })

  it('parses May 2026 fatura paga with mixed charges', () => {
    const buffer = readFileSync(resolve(fixturesDir, 'itau-fatura-paga-7735-maio2026.xlsx'))

    const result = parseItauXlsx({
      buffer,
      fileName: 'fatura-paga-final 7735-maio2026.xlsx',
      closingDay: 1,
      dueDay: 8,
    })

    expect(result.cardLastFour).toBe('7735')
    expect(result.parsed.totalAmount).toBe('2807.28')
    expect(result.parsed.dueDate).toBe('2026-05-18T12:00:00.000Z')
    expect(result.transactionsCount).toBeGreaterThan(5)

    const installment = result.parsed.transactions.find(tx =>
      tx.title.includes('Macharybeauty')
    )
    expect(installment?.installmentNumber).toBe(1)
    expect(installment?.installmentsTotal).toBe(3)

    const virtualCardRow = result.parsed.transactions.find(tx =>
      tx.title.includes('Telos Emp Imob')
    )
    expect(virtualCardRow?.cardLastFour).toBeUndefined()
  })

  it('rejects files without fatura paga header', () => {
    const buffer = Buffer.from('not an xlsx', 'utf8')

    expect(() =>
      parseItauXlsx({
        buffer,
        fileName: 'invalid.xlsx',
      })
    ).toThrow(/Fatura Paga|Fatura Aberta|planilha|XLSX/)
  })

  it('parses July 2026 fatura aberta with partial total', () => {
    const buffer = readFileSync(resolve(fixturesDir, 'itau-fatura-aberta-7735-julho2026.xlsx'))

    const result = parseItauXlsx({
      buffer,
      fileName: 'fatura-aberta-final 7735-julho2026.xlsx',
      closingDay: 1,
      dueDay: 8,
    })

    expect(result.invoiceKind).toBe('open')
    expect(result.cardLastFour).toBe('7735')
    expect(result.parsed.isClosed).toBe(false)
    expect(result.parsed.isPaid).toBe(false)
    expect(result.parsed.totalAmount).toBe('112.00')
    expect(result.parsed.dueDate).toBe('2026-07-17T12:00:00.000Z')
    expect(result.transactionsCount).toBe(3)

    const payment = result.parsed.transactions.find(tx => tx.title === 'Pagamento Debito Automatico')
    expect(payment?.type).toBe('income')
    expect(payment?.amount).toBe('4307.66')
  })
})
