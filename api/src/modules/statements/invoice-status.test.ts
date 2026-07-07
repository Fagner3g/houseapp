import { describe, expect, it, vi } from 'vitest'

import {
  detectClosedFromPdfText,
  detectInvoiceStatus,
  isBillingCycleClosed,
  isCardStatementCreditTitle,
  shouldCreateSyntheticPaymentOnImport,
  shouldMarkImportedIncomePaid,
  suggestPaidFromStatement,
  sumPaymentsInWindow,
} from './invoice-status'
import { parseNubankMetadataFromText } from './nubank-text-parser'
import { parseNubankCsv } from './nubank-csv-parser'
import { parseNubankOfx } from './nubank-ofx-parser'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const fixturesDir = resolve(__dirname, 'fixtures')

const MAY_SUMMARY = `
RESUMO DA FATURA ATUAL
Fatura anterior R$ 5.828,84
Pagamento recebido −R$ 5.828,84
Total de compras de todos os cartões, 01 ABR a 01 MAI R$ 5.647,17
Total a pagar R$ 6.104,49
Data de vencimento: 08 MAI 2026
Período vigente: 01 ABR a 01 MAI
EMISSÃO E ENVIO 01 MAI 2026
`

const PAID_SUMMARY = `
RESUMO DA FATURA ATUAL
Total a pagar R$ 0,00
Data de vencimento: 08 MAI 2026
Período vigente: 01 ABR a 01 MAI
EMISSÃO E ENVIO 01 MAI 2026
`

describe('shouldCreateSyntheticPaymentOnImport', () => {
  it('creates synthetic payment only for PDF imports', () => {
    expect(shouldCreateSyntheticPaymentOnImport('pdf')).toBe(true)
    expect(shouldCreateSyntheticPaymentOnImport('ofx')).toBe(false)
    expect(shouldCreateSyntheticPaymentOnImport('csv')).toBe(false)
    expect(shouldCreateSyntheticPaymentOnImport(null)).toBe(false)
  })
})

describe('isCardStatementCreditTitle', () => {
  it('detects card payment and adjustment credits', () => {
    expect(isCardStatementCreditTitle('Pagamento recebido')).toBe(true)
    expect(isCardStatementCreditTitle('Crédito de Confiança de "Vantagens.Cvolta.Com"')).toBe(
      true
    )
    expect(isCardStatementCreditTitle('Pagamento em 08 ABR')).toBe(true)
    expect(isCardStatementCreditTitle('Salário Empresa X')).toBe(false)
  })
})

describe('shouldMarkImportedIncomePaid', () => {
  it('marks income as paid on closed invoice imports even outside payment window', () => {
    expect(
      shouldMarkImportedIncomePaid({
        type: 'income',
        isClosed: true,
        markPaymentsAsPaid: false,
        inPaymentWindow: false,
      })
    ).toBe(true)
  })

  it('keeps open-cycle income pending until invoice is paid', () => {
    expect(
      shouldMarkImportedIncomePaid({
        type: 'income',
        isClosed: false,
        markPaymentsAsPaid: false,
        inPaymentWindow: true,
      })
    ).toBe(false)
  })
})

describe('suggestPaidFromStatement', () => {
  it('detects paid when total is zero', () => {
    expect(suggestPaidFromStatement({ totalAmount: '0.00' }).suggestedPaid).toBe(true)
  })

  it('detects paid when card payments in window cover the total', () => {
    const result = suggestPaidFromStatement({
      totalAmount: '500.00',
      periodEnd: '2026-05-01T12:00:00.000Z',
      dueDate: '2026-05-08T12:00:00.000Z',
      transactions: [
        {
          type: 'income',
          amount: '500.00',
          date: '2026-05-05T12:00:00.000Z',
        },
      ],
    })

    expect(result.suggestedPaid).toBe(true)
  })

  it('detects unpaid when total is positive and no payment in window', () => {
    expect(
      suggestPaidFromStatement({
        totalAmount: '6104.49',
        periodEnd: '2026-05-01T12:00:00.000Z',
        dueDate: '2026-05-08T12:00:00.000Z',
        transactions: [
          {
            type: 'income',
            amount: '5828.84',
            date: '2026-04-08T12:00:00.000Z',
          },
        ],
      }).suggestedPaid
    ).toBe(false)
  })
})

describe('detectInvoiceStatus', () => {
  it('marks CSV export as partial open invoice', () => {
    const content = readFileSync(resolve(fixturesDir, 'Nubank_2026-07-17.csv'), 'utf8')
    const parsed = parseNubankCsv({ content, fileName: 'Nubank_2026-07-17.csv', closingDay: 1, dueDay: 8 })

    const status = detectInvoiceStatus({
      provider: 'csv',
      totalAmount: parsed.parsed.totalAmount,
    })

    expect(status.kind).toBe('partial')
    expect(status.importSource).toBe('csv')
    expect(status.defaultIsClosed).toBe(false)
    expect(status.defaultIsPaid).toBe(false)
  })

  it('marks PDF with positive total as closed and unpaid', () => {
    const status = detectInvoiceStatus({
      provider: 'regex',
      extractedText: MAY_SUMMARY,
      totalAmount: '6104.49',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-05-08T12:00:00.000Z',
      transactions: [],
    })

    expect(status.kind).toBe('closed_unpaid')
    expect(status.defaultIsClosed).toBe(true)
    expect(status.defaultIsPaid).toBe(false)
  })

  it('marks PDF with zero total as closed and paid', () => {
    const status = detectInvoiceStatus({
      provider: 'regex',
      extractedText: PAID_SUMMARY,
      totalAmount: '0.00',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-05-08T12:00:00.000Z',
      transactions: [],
    })

    expect(status.kind).toBe('closed_paid')
    expect(status.defaultIsClosed).toBe(true)
    expect(status.defaultIsPaid).toBe(true)
  })

  it('marks OFX export as closed invoice with payment inference', () => {
    const content = readFileSync(resolve(fixturesDir, 'Nubank_2026-04-08.ofx'), 'utf8')
    const parsed = parseNubankOfx({
      content,
      fileName: 'Nubank_2026-04-08.ofx',
      closingDay: 1,
      dueDay: 8,
    })

    const status = detectInvoiceStatus({
      provider: 'ofx',
      totalAmount: parsed.parsed.totalAmount,
      periodEnd: parsed.parsed.periodEnd,
      dueDate: parsed.parsed.dueDate,
      transactions: parsed.parsed.transactions.map(tx => ({
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
      })),
    })

    expect(status.kind).toBe('closed_unpaid')
    expect(status.importSource).toBe('ofx')
    expect(status.defaultIsClosed).toBe(true)
    expect(status.defaultIsPaid).toBe(false)
    expect(status.detectedClosed).toBe(true)
  })

  it('marks OFX as partial when closing date is still in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:00:00.000Z'))

    try {
      const status = detectInvoiceStatus({
        provider: 'ofx',
        totalAmount: '6268.27',
        periodEnd: '2026-07-10T12:00:00.000Z',
        dueDate: '2026-07-17T00:00:00.000Z',
        transactions: [],
      })

      expect(status.kind).toBe('partial')
      expect(status.defaultIsClosed).toBe(false)
      expect(status.defaultIsPaid).toBe(false)
      expect(status.suggestedPaidReason).toContain('fechamento ainda não ocorreu')
    } finally {
      vi.useRealTimers()
    }
  })

  it('marks PDF with in-window payment as closed and paid', () => {
    const status = detectInvoiceStatus({
      provider: 'regex',
      extractedText: MAY_SUMMARY,
      totalAmount: '500.00',
      periodEnd: '2026-05-01T12:00:00.000Z',
      dueDate: '2026-05-08T12:00:00.000Z',
      transactions: [
        {
          type: 'income',
          amount: '500.00',
          date: '2026-05-05T12:00:00.000Z',
        },
      ],
    })

    expect(status.kind).toBe('closed_paid')
    expect(status.defaultIsPaid).toBe(true)
  })
})

describe('isBillingCycleClosed', () => {
  it('returns false while today is before the closing date', () => {
    expect(
      isBillingCycleClosed('2026-07-10T12:00:00.000Z', new Date('2026-07-03T12:00:00.000Z'))
    ).toBe(false)
  })

  it('returns true on or after the closing date', () => {
    expect(
      isBillingCycleClosed('2026-07-10T12:00:00.000Z', new Date('2026-07-10T12:00:00.000Z'))
    ).toBe(true)
    expect(
      isBillingCycleClosed('2026-07-10T12:00:00.000Z', new Date('2026-07-15T12:00:00.000Z'))
    ).toBe(true)
  })
})

describe('detectClosedFromPdfText', () => {
  it('detects closed invoice metadata in May summary text', () => {
    expect(detectClosedFromPdfText(MAY_SUMMARY)).toBe(true)

    const meta = parseNubankMetadataFromText(MAY_SUMMARY)
    expect(meta.totalAmount).toBe('6104.49')
  })
})

describe('sumPaymentsInWindow', () => {
  it('ignores payments outside the invoice window', () => {
    const total = sumPaymentsInWindow(
      [
        { type: 'income', amount: '5828.84', date: '2026-04-08T12:00:00.000Z' },
        { type: 'income', amount: '100.00', date: '2026-05-05T12:00:00.000Z' },
      ],
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-08T12:00:00.000Z')
    )

    expect(total).toBe(100)
  })
})
