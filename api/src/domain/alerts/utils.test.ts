import { describe, expect, it } from 'vitest'

import {
  bold,
  buildReminderDedupeKey,
  buildTransactionAlertExtraInfo,
  buildTransactionInstallmentInfo,
  buildTransactionPartialPaymentInfo,
  computeDaysUntilDue,
  formatNotifyTime,
  formatReminderWhatsAppMessage,
  formatTransactionWhatsAppMessage,
  getTransactionDisplayAmountCents,
  matchesNotifyTime,
  resolveNotifyTime,
} from './utils'

const TIMEZONE = 'America/Sao_Paulo'

describe('computeDaysUntilDue', () => {
  const referenceDate = new Date('2026-06-11T15:00:00.000Z')

  it('returns 0 when due date is today in org timezone', () => {
    const dueDate = new Date('2026-06-11T15:00:00.000Z')
    expect(computeDaysUntilDue(dueDate, referenceDate, TIMEZONE)).toBe(0)
  })

  it('returns 1 when due date is tomorrow in org timezone', () => {
    const dueDate = new Date('2026-06-12T15:00:00.000Z')
    expect(computeDaysUntilDue(dueDate, referenceDate, TIMEZONE)).toBe(1)
  })

  it('uses org timezone calendar days instead of server local midnight', () => {
    const dueDate = new Date('2026-06-11T12:00:00.000Z')
    expect(computeDaysUntilDue(dueDate, referenceDate, TIMEZONE)).toBe(0)
  })
})

describe('resolveNotifyTime', () => {
  it('uses reminder override when provided', () => {
    expect(resolveNotifyTime(11, 15, 9, 0)).toEqual({ hour: 11, minute: 15 })
  })

  it('falls back to org defaults when reminder values are null', () => {
    expect(resolveNotifyTime(null, null, 11, 15)).toEqual({ hour: 11, minute: 15 })
  })

  it('falls back to 09:00 when all values are missing', () => {
    expect(resolveNotifyTime(null, null, null, null)).toEqual({ hour: 9, minute: 0 })
  })
})

describe('matchesNotifyTime', () => {
  it('matches hour and minute in org timezone', () => {
    const referenceDate = new Date('2026-06-11T14:15:00.000Z')
    expect(matchesNotifyTime({ hour: 11, minute: 15 }, referenceDate, TIMEZONE)).toBe(true)
  })

  it('does not match when minute differs', () => {
    const referenceDate = new Date('2026-06-11T14:15:00.000Z')
    expect(matchesNotifyTime({ hour: 11, minute: 0 }, referenceDate, TIMEZONE)).toBe(false)
  })
})

describe('formatNotifyTime', () => {
  it('formats as HH:mm', () => {
    expect(formatNotifyTime(11, 15)).toBe('11:15')
    expect(formatNotifyTime(9, 5)).toBe('09:05')
  })
})

describe('buildReminderDedupeKey', () => {
  it('includes notify time so rescheduling allows a new delivery', () => {
    const dueDate = new Date('2026-06-11T15:00:00.000Z')
    const atNine = buildReminderDedupeKey('r1', dueDate, 0, 'in_app', { hour: 11, minute: 0 })
    const atTwentyFour = buildReminderDedupeKey('r1', dueDate, 0, 'in_app', {
      hour: 11,
      minute: 24,
    })

    expect(atNine).not.toBe(atTwentyFour)
    expect(atTwentyFour).toContain(':at-1124:')
  })
})

describe('buildTransactionInstallmentInfo', () => {
  it('returns installment label for multi-installment transactions', () => {
    expect(buildTransactionInstallmentInfo(9, 12)).toBe('Parcela 9/12')
    expect(buildTransactionInstallmentInfo(4, 10)).toBe('Parcela 4/10')
  })

  it('returns null for single installment transactions', () => {
    expect(buildTransactionInstallmentInfo(1, 1)).toBeNull()
  })

  it('returns null when installment data is missing', () => {
    expect(buildTransactionInstallmentInfo(null, 12)).toBeNull()
    expect(buildTransactionInstallmentInfo(2, null)).toBeNull()
  })
})

describe('buildTransactionPartialPaymentInfo', () => {
  it('returns partial payment label with paid and total amounts', () => {
    expect(buildTransactionPartialPaymentInfo('partial', 10000, 15000)).toBe(
      'Pagamento parcial: R$ 100,00 de R$ 150,00'
    )
  })

  it('returns null for pending transactions', () => {
    expect(buildTransactionPartialPaymentInfo('pending', 10000, 15000)).toBeNull()
  })
})

describe('buildTransactionAlertExtraInfo', () => {
  it('combines installment and partial payment lines', () => {
    expect(
      buildTransactionAlertExtraInfo({
        installmentIndex: 4,
        installmentsTotal: 10,
        status: 'partial',
        valuePaidCents: 50000,
        amountCents: 100000,
      })
    ).toBe('Parcela 4/10\nPagamento parcial: R$ 500,00 de R$ 1.000,00')
  })

  it('returns null when there is nothing extra to show', () => {
    expect(
      buildTransactionAlertExtraInfo({
        installmentIndex: 1,
        installmentsTotal: 1,
        status: 'pending',
        valuePaidCents: null,
        amountCents: 100000,
      })
    ).toBeNull()
  })
})

describe('getTransactionDisplayAmountCents', () => {
  it('returns remaining amount for partial transactions', () => {
    expect(
      getTransactionDisplayAmountCents({
        status: 'partial',
        amountCents: 15000,
        valuePaidCents: 10000,
      })
    ).toBe(5000)
  })

  it('returns full amount for pending transactions', () => {
    expect(
      getTransactionDisplayAmountCents({
        status: 'pending',
        amountCents: 15000,
        valuePaidCents: null,
      })
    ).toBe(15000)
  })
})

describe('bold', () => {
  it('trims whitespace inside asterisks', () => {
    expect(bold('Vencida: Boleto ')).toBe('*Vencida: Boleto*')
    expect(bold('  Lembrete: Conta  ')).toBe('*Lembrete: Conta*')
  })
})

describe('formatReminderWhatsAppMessage', () => {
  it('trims title inside bold segment', () => {
    const message = formatReminderWhatsAppMessage({
      title: 'Boleto ',
      dueDate: '2026-05-20T12:00:00.000Z',
      daysUntilDue: 0,
      amountCents: null,
      notes: null,
    })

    expect(message).toMatch(/^🔔 \*Lembrete: Boleto\*/)
    expect(message).not.toContain('*Lembrete: Boleto *')
  })
})

describe('formatTransactionWhatsAppMessage', () => {
  it('omits installment line for single-installment transactions', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Empréstimo 4k',
      dueDate: '2026-06-12T12:00:00.000Z',
      amountCents: 400000,
      daysUntilDue: 1,
      installmentInfo: null,
      kind: 'upcoming',
    })

    expect(message).not.toContain('Parcela')
  })

  it('includes installment and partial payment lines when provided', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Compra de celular',
      dueDate: '2026-06-12T12:00:00.000Z',
      amountCents: 50000,
      daysUntilDue: 1,
      installmentInfo: 'Parcela 4/10\nPagamento parcial: R$ 500,00 de R$ 1.000,00',
      kind: 'upcoming',
    })

    expect(message).toContain('Parcela 4/10')
    expect(message).toContain('Pagamento parcial: R$ 500,00 de R$ 1.000,00')
  })

  it('trims title inside bold segment for upcoming alerts', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Boleto ',
      dueDate: '2026-06-12T12:00:00.000Z',
      amountCents: 32136,
      daysUntilDue: 1,
      kind: 'upcoming',
    })

    expect(message).toMatch(/^📅 \*Vencimento: Boleto\*/)
    expect(message).not.toContain('*Vencimento: Boleto *')
  })

  it('trims title inside bold segment for overdue alerts', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Boleto ',
      dueDate: '2026-05-20T12:00:00.000Z',
      amountCents: 32136,
      overdueDays: 22,
      kind: 'overdue',
    })

    expect(message).toMatch(/^⚠️ \*Vencida: Boleto\*/)
    expect(message).not.toContain('*Vencida: Boleto *')
    expect(message).toContain('22 dias em atraso')
  })
})
