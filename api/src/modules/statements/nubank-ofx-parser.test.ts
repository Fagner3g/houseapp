import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { parseNubankOfx } from './nubank-ofx-parser'

const fixturePath = join(__dirname, 'fixtures', 'Nubank_2026-04-08.ofx')

describe('parseNubankOfx', () => {
  it('extracts ACCTID, billing cycle and transactions from Nubank OFX', () => {
    const content = readFileSync(fixturePath, 'utf8')

    const result = parseNubankOfx({
      content,
      fileName: 'Nubank_2026-04-08.ofx',
    })

    expect(result.ofxAccountId).toBe('5f3318ca-72cd-4d70-9ed8-1d8534f5652c')
    expect(result.transactionsCount).toBeGreaterThan(0)
    expect(result.parsed.totalAmount).toBe('5828.83')
    expect(result.parsed.importSource).toBe('ofx')
    expect(result.parsed.isClosed).toBe(true)
    expect(result.suggestedAccount.institution).toBe('nubank')
    expect(result.suggestedAccount.name).toBe('Nubank')
    expect(result.suggestedAccount.closingDay).toBe(1)
    expect(result.suggestedAccount.dueDay).toBe(8)
    expect(result.suggestedAccount.creditLimit).toBeNull()
    expect(result.parsed.transactions[0]?.externalId).toHaveLength(64)
    expect(result.parsed.purchasesTotal).toBe('5836.51')
    expect(result.parsed.previousBalance).toBe('0.00')
    expect(result.parsed.paymentsReceived).toBe('0.00')
  })

  it('extracts credit limit when OFX includes CREDITLIM', () => {
    const content = readFileSync(fixturePath, 'utf8').replace(
      '</LEDGERBAL>',
      '</LEDGERBAL>\n<CREDITLIM>15000.00</CREDITLIM>'
    )

    const result = parseNubankOfx({
      content,
      fileName: 'Nubank_2026-04-08.ofx',
    })

    expect(result.suggestedAccount.creditLimit).toBe('15000.00')
  })

  it('leaves due day empty when filename has no Nubank due date', () => {
    const content = readFileSync(fixturePath, 'utf8')

    const result = parseNubankOfx({
      content,
      fileName: 'fatura-nubank.ofx',
    })

    expect(result.suggestedAccount.closingDay).toBe(1)
    expect(result.suggestedAccount.dueDay).toBeNull()
  })

  it('extracts due date from filenames with suffix before .ofx', () => {
    const content = readFileSync(fixturePath, 'utf8')

    const result = parseNubankOfx({
      content,
      fileName: 'Nubank_2026-04-08 - atualizado.ofx',
    })

    expect(result.suggestedAccount.dueDay).toBe(8)
    expect(result.parsed.dueDate).toBe('2026-04-08T12:00:00.000Z')
  })

  it('marks OFX as open when closing date is still in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))

    try {
      const content = readFileSync(fixturePath, 'utf8').replace(
        /<DTEND>20260401000000\[.*?\]<\/DTEND>/,
        '<DTEND>20260710000000[-3:BRT]</DTEND>'
      )

      const result = parseNubankOfx({
        content,
        fileName: 'Nubank_2026-07-17 - atualizado.ofx',
        closingDay: 10,
        dueDay: 17,
      })

      expect(result.parsed.periodEnd).toBe('2026-07-10T12:00:00.000Z')
      expect(result.parsed.dueDate).toBe('2026-07-17T12:00:00.000Z')
      expect(result.parsed.isClosed).toBe(false)
      expect(result.parsed.isPaid).toBe(false)
      expect(result.suggestedAccount.dueDay).toBe(17)
    } finally {
      vi.useRealTimers()
    }
  })
})
