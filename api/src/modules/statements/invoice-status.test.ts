import { describe, expect, it, vi } from 'vitest'

import {
  detectInvoiceStatus,
  isBillingCycleClosed,
  isCardStatementCreditTitle,
  shouldMarkImportedIncomePaid,
  suggestPaidFromStatement,
  sumPaymentsInWindow,
} from './invoice-status'
import { parseItauXlsx } from './itau-xlsx'
import { parseNubankOfx } from './nubank-ofx-parser'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const fixturesDir = resolve(__dirname, 'fixtures')

describe('isCardStatementCreditTitle', () => {
  it('detects card payment and adjustment credits', () => {
    expect(isCardStatementCreditTitle('Pagamento recebido')).toBe(true)
    expect(isCardStatementCreditTitle('Pagamento Debito Automatico')).toBe(true)
    expect(isCardStatementCreditTitle('Pagamento Efetuado')).toBe(true)
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
  it('marks XLSX export as closed and paid', () => {
    const buffer = readFileSync(resolve(fixturesDir, 'itau-fatura-paga-4368-junho2026.xlsx'))
    const parsed = parseItauXlsx({
      buffer,
      fileName: 'fatura-paga-final 4368-junho2026.xlsx',
      closingDay: 1,
      dueDay: 8,
    })

    const status = detectInvoiceStatus({
      provider: 'xlsx',
      totalAmount: parsed.parsed.totalAmount,
      xlsxVariant: parsed.invoiceKind,
    })

    expect(status.kind).toBe('closed_paid')
    expect(status.importSource).toBe('xlsx')
    expect(status.defaultIsClosed).toBe(true)
    expect(status.defaultIsPaid).toBe(true)
  })

  it('marks open XLSX export as partial', () => {
    const buffer = readFileSync(resolve(fixturesDir, 'itau-fatura-aberta-7735-julho2026.xlsx'))
    const parsed = parseItauXlsx({
      buffer,
      fileName: 'fatura-aberta-final 7735-julho2026.xlsx',
      closingDay: 1,
      dueDay: 8,
    })

    const status = detectInvoiceStatus({
      provider: 'xlsx',
      totalAmount: parsed.parsed.totalAmount,
      xlsxVariant: parsed.invoiceKind,
    })

    expect(status.kind).toBe('partial')
    expect(status.defaultIsClosed).toBe(false)
    expect(status.defaultIsPaid).toBe(false)
    expect(status.suggestedPaidReason).toContain('fatura aberta')
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

  it('marks OFX with in-window payment as closed and paid', () => {
    const status = detectInvoiceStatus({
      provider: 'ofx',
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
