import { describe, expect, it } from 'vitest'

import {
  bold,
  buildLogicalAlertKey,
  buildReminderDedupeKey,
  buildReminderOverdueDayDedupeKey,
  buildReminderOverdueDedupeKey,
  buildReminderUpcomingDedupeKey,
  buildTransactionAlertExtraInfo,
  buildTransactionInstallmentInfo,
  buildTransactionPartialPaymentInfo,
  composeWhatsAppAlertMessage,
  joinWhatsAppAlertBodies,
  WHATSAPP_ALERT_BODY_DIVIDER,
  computeDaysUntilDue,
  dedupeDeliveriesByLogicalAlert,
  formatDueDateKey,
  formatInvestmentWhatsAppMessage,
  formatNotifyTime,
  formatReminderWhatsAppMessage,
  formatTransactionWhatsAppMessage,
  getReminderPeriodKey,
  isValidReminderOccurrenceDate,
  parseOccurrenceDateKey,
  resolveReminderEvaluationDueDate,
  getTimeBasedGreeting,
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

describe('buildReminderUpcomingDedupeKey', () => {
  it('includes notify time so rescheduling allows a new delivery', () => {
    const atNine = buildReminderUpcomingDedupeKey('r1', 0, 'u1', 'in_app', { hour: 11, minute: 0 })
    const atTwentyFour = buildReminderUpcomingDedupeKey('r1', 0, 'u1', 'in_app', {
      hour: 11,
      minute: 24,
    })

    expect(atNine).not.toBe(atTwentyFour)
    expect(atTwentyFour).toContain(':at-1124:')
    expect(atTwentyFour).toBe('reminder:r1:day-0:at-1124:u1:in_app')
  })

  it('includes user id so recipients do not block each other', () => {
    const fagner = buildReminderUpcomingDedupeKey('r1', 3, 'fagner', 'whatsapp', {
      hour: 11,
      minute: 0,
    })
    const karoline = buildReminderUpcomingDedupeKey('r1', 3, 'karoline', 'whatsapp', {
      hour: 11,
      minute: 0,
    })

    expect(fagner).not.toBe(karoline)
  })
})

describe('buildReminderOverdueDayDedupeKey', () => {
  it('dedupes by overdue day milestone separately from upcoming day', () => {
    const overdueDayOne = buildReminderOverdueDayDedupeKey('r1', 1, 'u1', 'in_app', {
      hour: 11,
      minute: 0,
    })
    const upcomingDayOne = buildReminderUpcomingDedupeKey('r1', 1, 'u1', 'in_app', {
      hour: 11,
      minute: 0,
    })

    expect(overdueDayOne).not.toBe(upcomingDayOne)
    expect(overdueDayOne).toBe('reminder:r1:overdue-day-1:at-1100:u1:in_app')
  })
})

describe('buildReminderOverdueDedupeKey', () => {
  it('dedupes by period key instead of days before', () => {
    const weekOne = buildReminderOverdueDedupeKey('r1', 'w-100', 'u1', 'in_app', {
      hour: 11,
      minute: 0,
    })
    const weekTwo = buildReminderOverdueDedupeKey('r1', 'w-101', 'u1', 'in_app', {
      hour: 11,
      minute: 0,
    })

    expect(weekOne).not.toBe(weekTwo)
    expect(weekOne).toContain(':period-w-100:')
  })
})

describe('buildReminderDedupeKey', () => {
  it('delegates to upcoming dedupe key format', () => {
    const dueDate = new Date('2026-06-11T15:00:00.000Z')
    expect(buildReminderDedupeKey('r1', dueDate, 1, 'u1', 'whatsapp', { hour: 9, minute: 0 })).toBe(
      buildReminderUpcomingDedupeKey('r1', 1, 'u1', 'whatsapp', { hour: 9, minute: 0 })
    )
  })
})

describe('resolveReminderEvaluationDueDate', () => {
  const baseReminder = {
    completedAt: null,
    isRecurring: true,
    recurrenceType: 'monthly' as const,
    recurrenceInterval: 1,
    recurrenceUntil: null,
    lastCompletedPeriodKey: null,
  }

  it('rolls forward monthly reminders from a past period to the current period', () => {
    const referenceDate = new Date('2026-06-08T14:00:00.000Z')
    const dueDate = new Date('2026-05-10T12:00:00.000Z')

    expect(
      resolveReminderEvaluationDueDate({ ...baseReminder, dueDate }, referenceDate, TIMEZONE)
    ).toEqual(new Date('2026-06-10T12:00:00.000Z'))
  })

  it('keeps the due date within the same overdue period', () => {
    const referenceDate = new Date('2026-05-15T14:00:00.000Z')
    const dueDate = new Date('2026-05-10T12:00:00.000Z')

    expect(
      resolveReminderEvaluationDueDate({ ...baseReminder, dueDate }, referenceDate, TIMEZONE)
    ).toEqual(dueDate)
  })

  it('does not roll forward one-shot reminders', () => {
    const referenceDate = new Date('2026-06-08T14:00:00.000Z')
    const dueDate = new Date('2026-05-10T12:00:00.000Z')

    expect(
      resolveReminderEvaluationDueDate(
        {
          ...baseReminder,
          dueDate,
          isRecurring: false,
          recurrenceType: null,
        },
        referenceDate,
        TIMEZONE
      )
    ).toEqual(dueDate)
  })

  it('rolls forward yearly reminders across years', () => {
    const referenceDate = new Date('2026-06-08T14:00:00.000Z')
    const dueDate = new Date('2025-03-15T12:00:00.000Z')

    expect(
      resolveReminderEvaluationDueDate(
        { ...baseReminder, dueDate, recurrenceType: 'yearly' },
        referenceDate,
        TIMEZONE
      )
    ).toEqual(new Date('2026-03-15T12:00:00.000Z'))
  })
})

describe('getReminderPeriodKey', () => {
  const dueDate = new Date('2026-06-11T15:00:00.000Z')

  it('returns YYYY-MM for monthly recurrence', () => {
    expect(getReminderPeriodKey(dueDate, 'monthly', TIMEZONE)).toBe('2026-06')
  })

  it('returns ISO week for weekly recurrence', () => {
    expect(getReminderPeriodKey(dueDate, 'weekly', TIMEZONE)).toMatch(/^2026-W\d{2}$/)
  })

  it('returns year for yearly recurrence', () => {
    expect(getReminderPeriodKey(dueDate, 'yearly', TIMEZONE)).toBe('2026')
  })

  it('returns YYYY-MM for one-shot reminders', () => {
    expect(getReminderPeriodKey(dueDate, null, TIMEZONE)).toBe('2026-06')
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

describe('getTimeBasedGreeting', () => {
  it('returns Bom dia in the morning', () => {
    const morning = new Date('2026-06-11T11:00:00.000Z')
    expect(getTimeBasedGreeting(morning, TIMEZONE)).toBe('Bom dia')
  })

  it('returns Boa tarde in the afternoon', () => {
    const afternoon = new Date('2026-06-11T16:00:00.000Z')
    expect(getTimeBasedGreeting(afternoon, TIMEZONE)).toBe('Boa tarde')
  })

  it('returns Boa noite at night', () => {
    const night = new Date('2026-06-11T23:00:00.000Z')
    expect(getTimeBasedGreeting(night, TIMEZONE)).toBe('Boa noite')
  })
})

describe('composeWhatsAppAlertMessage', () => {
  it('includes greeting, org section, and alert bodies for org owner', () => {
    const message = composeWhatsAppAlertMessage({
      recipientName: 'João Silva',
      orgName: 'Minha Casa',
      isOrgOwner: true,
      bodies: ['📅 *Aluguel*\n\nVence hoje · 11/06/2026\n💰 R$ 1.500,00'],
      referenceDate: new Date('2026-06-11T11:00:00.000Z'),
      timezone: TIMEZONE,
    })

    expect(message).toContain('Bom dia, João!')
    expect(message).toContain('🏠 *Minha Casa*')
    expect(message).toContain('📅 *Aluguel*')
    expect(message).toContain('Vence hoje · 11/06/2026')
    expect(message).toContain('💰 R$ 1.500,00')
  })

  it('omits org section for non-owner members', () => {
    const message = composeWhatsAppAlertMessage({
      recipientName: 'Karoline',
      orgName: 'Casa',
      isOrgOwner: false,
      bodies: ['📅 *Academia 12x*\n\nVence hoje · 11/06/2026\n💰 R$ 119,90'],
      referenceDate: new Date('2026-06-11T16:00:00.000Z'),
      timezone: TIMEZONE,
    })

    expect(message).toBe(
      'Boa tarde, Karoline!\n\n📅 *Academia 12x*\n\nVence hoje · 11/06/2026\n💰 R$ 119,90'
    )
    expect(message).not.toContain('🏠')
  })

  it('groups multiple alerts under one org header for org owner', () => {
    const message = composeWhatsAppAlertMessage({
      recipientName: 'Maria',
      orgName: 'Escritório',
      isOrgOwner: true,
      bodies: ['📅 *Internet*', '🔔 *Renovar seguro*'],
      referenceDate: new Date('2026-06-11T16:00:00.000Z'),
      timezone: TIMEZONE,
    })

    expect(message).toContain('Boa tarde, Maria!')
    expect(message).toMatch(
      new RegExp(
        `🏠 \\*Escritório\\*\\n\\n📅 \\*Internet\\*\\n\\n${WHATSAPP_ALERT_BODY_DIVIDER}\\n\\n🔔 \\*Renovar seguro\\*`
      )
    )
  })

  it('separates multiple alert bodies with a divider', () => {
    const message = composeWhatsAppAlertMessage({
      recipientName: 'Fagner',
      orgName: 'Casa',
      isOrgOwner: false,
      bodies: [
        '📅 *Academia 12x*\n\nVence em 4 dias · 15/06/2026\n💰 R$ 119,90\n📎 Parcela 9/12',
        '❗ *Vivo*\n\n5 dias em atraso · venceu 06/06/2026\n💰 R$ 59,00',
      ],
      referenceDate: new Date('2026-06-11T16:00:00.000Z'),
      timezone: TIMEZONE,
    })

    expect(message).toContain(
      `📅 *Academia 12x*\n\nVence em 4 dias · 15/06/2026\n💰 R$ 119,90\n📎 Parcela 9/12\n\n${WHATSAPP_ALERT_BODY_DIVIDER}\n\n❗ *Vivo*`
    )
    expect(message).not.toMatch(new RegExp(`${WHATSAPP_ALERT_BODY_DIVIDER}\\n\\n$`))
  })

  it('does not prefix alerts with recipient labels', () => {
    const message = composeWhatsAppAlertMessage({
      recipientName: 'Fagner Gomes',
      orgName: 'Minha Casa',
      isOrgOwner: true,
      bodies: ['📅 *Internet*\n\nVence hoje · 11/06/2026', '📅 *Empréstimo*\n\nVence amanhã · 12/06/2026'],
      referenceDate: new Date('2026-06-11T11:00:00.000Z'),
      timezone: TIMEZONE,
    })

    expect(message).toContain('Bom dia, Fagner!')
    expect(message).not.toContain('👤')
    expect(message).toContain('🏠 *Minha Casa*')
    expect(message).toContain('📅 *Internet*')
    expect(message).toContain('📅 *Empréstimo*')
  })
})

describe('joinWhatsAppAlertBodies', () => {
  it('returns a single body unchanged', () => {
    expect(joinWhatsAppAlertBodies(['📅 *Aluguel*'])).toBe('📅 *Aluguel*')
  })

  it('joins multiple bodies with the divider', () => {
    expect(joinWhatsAppAlertBodies(['📅 *Internet*', '🔔 *Seguro*'])).toBe(
      `📅 *Internet*\n\n${WHATSAPP_ALERT_BODY_DIVIDER}\n\n🔔 *Seguro*`
    )
  })
})

describe('formatReminderWhatsAppMessage', () => {
  it('formats upcoming reminder with bell icon', () => {
    const message = formatReminderWhatsAppMessage({
      title: 'Boleto ',
      dueDate: '2026-05-20T12:00:00.000Z',
      daysUntilDue: 0,
      amountCents: null,
      notes: null,
      kind: 'upcoming',
    })

    expect(message).toMatch(/^🔔 \*Boleto\*/)
    expect(message).not.toContain('*Boleto *')
    expect(message).toContain('Vence hoje ·')
  })

  it('formats upcoming amount and notes on separate lines', () => {
    const message = formatReminderWhatsAppMessage({
      title: 'Renovar seguro',
      dueDate: '2026-06-15T12:00:00.000Z',
      daysUntilDue: 4,
      amountCents: 25000,
      notes: 'Ligar para corretora',
      kind: 'upcoming',
    })

    expect(message).toBe(
      '🔔 *Renovar seguro*\n\nVence em 4 dias · 15/06/2026\n💰 R$ 250,00\n📝 Ligar para corretora'
    )
  })

  it('formats overdue reminder with bell icon', () => {
    const message = formatReminderWhatsAppMessage({
      title: 'IPTU',
      dueDate: '2026-06-05T12:00:00.000Z',
      overdueDays: 6,
      amountCents: 150000,
      notes: null,
      kind: 'overdue',
    })

    expect(message).toBe(
      '🔔 *IPTU*\n\n6 dias em atraso · venceu 05/06/2026\n💰 R$ 1.500,00'
    )
  })
})

describe('formatInvestmentWhatsAppMessage', () => {
  it('formats pending investment with breathing room', () => {
    const message = formatInvestmentWhatsAppMessage({
      assetSymbol: 'PETR4',
      plannedAmount: 500,
      plannedQuantity: null,
      referenceMonth: '2026-06',
      status: 'pending',
    })

    expect(message).toBe(
      '📈 *Aporte pendente: PETR4*\n\nReferência · 2026-06\n💰 R$ 500,00'
    )
  })

  it('formats overdue investment with alert icon', () => {
    const message = formatInvestmentWhatsAppMessage({
      assetSymbol: 'IVVB11',
      plannedAmount: null,
      plannedQuantity: 10,
      referenceMonth: '2026-05',
      status: 'overdue',
    })

    expect(message).toBe(
      '❗ *Aporte atrasado: IVVB11*\n\nReferência · 2026-05\n💰 10 un.'
    )
  })
})

describe('formatTransactionWhatsAppMessage', () => {
  it('formats upcoming transaction with spaced details', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Academia 12x',
      dueDate: '2026-06-15T12:00:00.000Z',
      amountCents: 11990,
      daysUntilDue: 4,
      installmentInfo: 'Parcela 9/12',
      kind: 'upcoming',
    })

    expect(message).toBe(
      '📅 *Academia 12x*\n\nVence em 4 dias · 15/06/2026\n💰 R$ 119,90\n📎 Parcela 9/12'
    )
  })

  it('formats overdue transaction with spaced details', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Vivo',
      dueDate: '2026-06-06T12:00:00.000Z',
      amountCents: 5900,
      overdueDays: 5,
      kind: 'overdue',
    })

    expect(message).toBe(
      '❗ *Vivo*\n\n5 dias em atraso · venceu 06/06/2026\n💰 R$ 59,00'
    )
  })

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
    expect(message).toContain('💳 Pagamento parcial: R$ 500,00 de R$ 1.000,00')
  })

  it('trims title inside bold segment for upcoming alerts', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Boleto ',
      dueDate: '2026-06-12T12:00:00.000Z',
      amountCents: 32136,
      daysUntilDue: 1,
      kind: 'upcoming',
    })

    expect(message).toMatch(/^📅 \*Boleto\*/)
    expect(message).not.toContain('*Boleto *')
    expect(message).toContain('💰 R$')
  })

  it('trims title inside bold segment for overdue alerts', () => {
    const message = formatTransactionWhatsAppMessage({
      title: 'Boleto ',
      dueDate: '2026-05-20T12:00:00.000Z',
      amountCents: 32136,
      overdueDays: 22,
      kind: 'overdue',
    })

    expect(message).toMatch(/^❗ \*Boleto\*/)
    expect(message).not.toContain('*Boleto *')
    expect(message).toContain('22 dias em atraso · venceu')
  })
})

describe('buildLogicalAlertKey', () => {
  it('groups rule deliveries across channels by occurrence and timing', () => {
    const base = {
      userId: 'user-1',
      sourceType: 'rule' as const,
      kind: 'transaction_upcoming',
      occurrenceId: 'occ-1',
      reminderId: null,
      ruleId: 'rule-1',
      payload: { daysUntilDue: 3 },
    }

    const whatsappKey = buildLogicalAlertKey(base)
    const inAppKey = buildLogicalAlertKey(base)

    expect(whatsappKey).toBe(inAppKey)
    expect(whatsappKey).toBe('rule:user-1:transaction_upcoming:occ-1:rule-1:3:')
  })
})

describe('dedupeDeliveriesByLogicalAlert', () => {
  it('collapses whatsapp and in_app rows into one delivery with channels', () => {
    const base = {
      userId: 'user-1',
      sourceType: 'rule' as const,
      kind: 'transaction_upcoming',
      occurrenceId: 'occ-1',
      reminderId: null,
      ruleId: 'rule-1',
      payload: { title: 'Cartão Ruivas Stores', daysUntilDue: 0 },
      sentAt: '2026-06-11T16:12:00.000Z',
      createdAt: '2026-06-11T16:12:00.000Z',
    }

    const deduped = dedupeDeliveriesByLogicalAlert([
      { id: 'wa-1', channel: 'whatsapp', ...base },
      { id: 'app-1', channel: 'in_app', ...base },
    ])

    expect(deduped).toHaveLength(1)
    expect(deduped[0].id).toBe('wa-1')
    expect(deduped[0].channels).toEqual(['whatsapp', 'in_app'])
  })

  it('keeps distinct alerts with different occurrence ids', () => {
    const shared = {
      userId: 'user-1',
      sourceType: 'rule' as const,
      kind: 'transaction_upcoming',
      reminderId: null,
      ruleId: 'rule-1',
      payload: { daysUntilDue: 0 },
      sentAt: '2026-06-11T16:12:00.000Z',
      createdAt: '2026-06-11T16:12:00.000Z',
    }

    const deduped = dedupeDeliveriesByLogicalAlert([
      { id: 'wa-1', channel: 'whatsapp', occurrenceId: 'occ-1', ...shared },
      { id: 'wa-2', channel: 'whatsapp', occurrenceId: 'occ-2', ...shared },
    ])

    expect(deduped).toHaveLength(2)
  })
})

describe('parseOccurrenceDateKey', () => {
  it('parses YYYY-MM-DD using org calendar anchor (stable on UTC servers)', () => {
    const parsed = parseOccurrenceDateKey('2026-06-08')
    expect(formatDueDateKey(parsed, TIMEZONE)).toBe('2026-06-08')
  })
})

describe('isValidReminderOccurrenceDate', () => {
  it('accepts prior recurring occurrence when server runs in UTC', () => {
    const reminder = {
      dueDate: new Date('2026-07-08T15:00:00.000Z'),
      completedAt: null,
      isRecurring: true,
      recurrenceType: 'monthly',
      recurrenceInterval: 1,
      recurrenceUntil: null,
      lastCompletedPeriodKey: null,
    }

    expect(
      isValidReminderOccurrenceDate(
        reminder,
        parseOccurrenceDateKey('2026-06-08'),
        TIMEZONE
      )
    ).toBe(true)
  })
})
