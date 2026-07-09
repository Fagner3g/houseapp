import { describe, expect, it } from 'vitest'

import {
  isCrossInvoiceBillPayment,
  isInvoiceSettlementCreditTitle,
  isWithinPreviousInvoicePaymentWindow,
  shouldMarkInvoicePaid,
  sumBillPaymentsInWindow,
  sumInvoiceSettlementInPeriod,
} from './cross-invoice-payment'

describe('cross-invoice-payment', () => {
  const aprilPrevious = {
    periodEnd: new Date('2026-04-01T12:00:00.000Z'),
    dueDate: new Date('2026-04-08T12:00:00.000Z'),
  }

  const mayCurrent = {
    periodStart: new Date('2026-04-01T12:00:00.000Z'),
    periodEnd: new Date('2026-05-01T12:00:00.000Z'),
  }

  it('detects April bill payment inside May OFX export', () => {
    expect(
      isCrossInvoiceBillPayment(
        {
          type: 'income',
          title: 'Pagamento recebido',
          date: new Date('2026-04-08T12:00:00.000Z'),
        },
        aprilPrevious,
        mayCurrent
      )
    ).toBe(true)
  })

  it('detects March bill payment one day after due date inside April OFX', () => {
    expect(
      isCrossInvoiceBillPayment(
        {
          type: 'income',
          title: 'Pagamento recebido',
          date: new Date('2026-03-09T12:00:00.000Z'),
        },
        {
          periodEnd: new Date('2026-03-01T12:00:00.000Z'),
          dueDate: new Date('2026-03-08T12:00:00.000Z'),
        },
        {
          periodStart: new Date('2026-03-01T12:00:00.000Z'),
          periodEnd: new Date('2026-04-01T12:00:00.000Z'),
        }
      )
    ).toBe(true)
  })

  it('ignores IOF credits', () => {
    expect(
      isCrossInvoiceBillPayment(
        {
          type: 'income',
          title: 'IOF de volta de Claude.Ai Subscription',
          date: new Date('2026-04-08T12:00:00.000Z'),
        },
        aprilPrevious,
        mayCurrent
      )
    ).toBe(false)
  })

  it('marks invoice paid when payment covers total', () => {
    expect(shouldMarkInvoicePaid(582883n, 582884n)).toBe(true)
    expect(shouldMarkInvoicePaid(610448n, 610449n)).toBe(true)
    expect(shouldMarkInvoicePaid(610448n, 50000n)).toBe(false)
  })

  it('sums bill payments in invoice window with one-day grace', () => {
    const total = sumBillPaymentsInWindow(
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: 582884n,
          date: new Date('2026-04-08T12:00:00.000Z'),
        },
        {
          type: 'income',
          title: 'IOF de volta',
          amount: 396n,
          date: new Date('2026-04-23T12:00:00.000Z'),
        },
      ],
      aprilPrevious.periodEnd,
      aprilPrevious.dueDate
    )

    expect(total).toBe(582884n)
  })

  it('includes payment posted one day after due date', () => {
    expect(
      isWithinPreviousInvoicePaymentWindow(
        new Date('2026-03-09T12:00:00.000Z'),
        new Date('2026-03-01T12:00:00.000Z'),
        new Date('2026-03-08T12:00:00.000Z')
      )
    ).toBe(true)
  })

  it('counts crédito de confiança in purchase period toward settlement', () => {
    expect(isInvoiceSettlementCreditTitle('Crédito de Confiança de "Vantagens.Cvolta.Com"')).toBe(
      true
    )
    expect(isInvoiceSettlementCreditTitle('Pagamento recebido')).toBe(false)
    expect(
      isInvoiceSettlementCreditTitle('Reversão do Crédito de confiança de Vantagens.Cvolta.Com')
    ).toBe(false)

    const settled = sumInvoiceSettlementInPeriod(
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: 695661n,
          date: new Date('2026-06-08T12:00:00.000Z'),
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: 250000n,
          date: new Date('2026-06-01T12:00:00.000Z'),
        },
        {
          type: 'income',
          title: 'Crédito de Confiança de "Vantagens.Cvolta.Com"',
          amount: 2700n,
          date: new Date('2026-05-29T12:00:00.000Z'),
        },
      ],
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-06-01T12:00:00.000Z'),
      new Date('2026-06-08T12:00:00.000Z')
    )

    expect(shouldMarkInvoicePaid(698360n, settled)).toBe(true)
  })
})
