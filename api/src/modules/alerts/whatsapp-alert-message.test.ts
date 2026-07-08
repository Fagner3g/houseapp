import { describe, expect, it } from 'vitest'

import {
  buildDetailLine,
  buildDueLine,
  buildGreeting,
  buildSummaryLine,
  buildWhatsAppAlertMessage,
  buildWhatsAppBatchAlertMessage,
  cleanTransactionTitle,
  formatAmountBRL,
  formatInstallmentLine,
  WHATSAPP_BATCH_SEPARATOR,
} from './whatsapp-alert-message'
import { resolveWhatsAppAlertAmounts } from './resolve-whatsapp-alert-amounts'

describe('whatsapp-alert-message', () => {
  it('resolves alert amounts for split installments', () => {
    expect(
      resolveWhatsAppAlertAmounts({
        transaction: {
          amount: 45000n,
          installmentNumber: 1,
          installmentsTotal: 3,
        },
        siblingTransactions: [{ amount: 45000n, installmentNumber: 1, installmentsTotal: 3 }],
        isSplit: true,
        amountOverride: '225.00',
      })
    ).toEqual({
      amount: '225.00',
      transactionTotalAmount: '450.00',
      installmentAmount: '150.00',
      splitAmount: '225.00',
    })
  })

  it('formats greeting by time of day', () => {
    const morning = new Date('2026-07-02T12:00:00.000Z') // 09:00 SP
    expect(buildGreeting('Fagner Gomes', morning)).toBe('Bom dia, Fagner!')
  })

  it('formats amount in BRL', () => {
    expect(formatAmountBRL('64.00')).toBe('R$ 64,00')
    expect(formatAmountBRL('287.5')).toBe('R$ 287,50')
  })

  it('cleans parcela suffix and alert prefixes from title', () => {
    expect(cleanTransactionTitle('Amazon - Parcela 7/12')).toBe('Amazon')
    expect(cleanTransactionTitle('Vencido há 31 dias: Bar do Rodrigo')).toBe('Bar do Rodrigo')
  })

  it('formats installment line', () => {
    expect(formatInstallmentLine(7, 12)).toBe('Parcela 7 de 12')
    expect(formatInstallmentLine(1, 1)).toBeNull()
  })

  it('builds detail line with account name only', () => {
    expect(buildDetailLine({ accountName: 'Nubank Ultravioleta' })).toBe('Nubank Ultravioleta')
    expect(buildDetailLine({})).toBeNull()
  })

  it('builds summary line for installments, splits and simple transactions', () => {
    expect(
      buildSummaryLine({
        transactionTotalAmount: '732.84',
        installmentAmount: '61.07',
        amount: '61.07',
        installmentNumber: 7,
        installmentsTotal: 12,
      })
    ).toBe('7/12: R$ 61,07')

    expect(
      buildSummaryLine({
        transactionTotalAmount: '1000.00',
        amount: '250.00',
        installmentNumber: 1,
        installmentsTotal: 4,
      })
    ).toBe('1/4: R$ 250,00')

    expect(
      buildSummaryLine({
        transactionTotalAmount: '8000.00',
        splitAmount: '4000.00',
        amount: '4000.00',
        isSplit: true,
        splitParticipantCount: 2,
      })
    ).toBe(['Sua parte: R$ 4000,00', 'Compra R$ 8000,00 · Dividido pra 2'].join('\n'))

    expect(
      buildSummaryLine({
        transactionTotalAmount: '900.00',
        splitAmount: '450.00',
        splitShareInstallmentAmount: '150.00',
        splitPaidAmount: '150.00',
        splitRemainingAmount: '300.00',
        amount: '300.00',
        installmentNumber: 1,
        installmentsTotal: 3,
        isSplit: true,
        splitParticipantCount: 2,
      })
    ).toBe(['1/3: R$ 150,00', 'Compra R$ 900,00 · Dividido pra 2'].join('\n'))

    expect(
      buildSummaryLine({
        transactionTotalAmount: '1675.10',
        splitAmount: '837.50',
        splitShareInstallmentAmount: '83.75',
        splitPaidAmount: '0.00',
        splitRemainingAmount: '837.50',
        amount: '837.50',
        installmentNumber: 1,
        installmentsTotal: 10,
        isSplit: true,
        splitParticipantCount: 2,
      })
    ).toBe(['1/10: R$ 83,75', 'Compra R$ 1675,10 · Dividido pra 2'].join('\n'))
  })

  it('formats credit card invoice due line', () => {
    expect(
      buildDueLine({
        daysUntilDue: 47,
        dueDate: '2026-08-18T12:00:00.000Z',
        isCreditCardInvoice: true,
      })
    ).toBe('Fatura Vence em 47 dias · 18/08/2026')
  })

  it('formats due line for upcoming alerts', () => {
    expect(
      buildDueLine({
        daysUntilDue: 4,
        dueDate: '2026-07-06T12:00:00.000Z',
      })
    ).toBe('Vence em 4 dias · 06/07/2026')

    expect(
      buildDueLine({
        daysUntilDue: 1,
        dueDate: '2026-07-03T12:00:00.000Z',
      })
    ).toBe('Vence amanhã · 03/07/2026')
  })

  it('builds full WhatsApp message without category', () => {
    const message = buildWhatsAppAlertMessage(
      {
        recipientName: 'Karoline',
        transactionTitle: 'Amazonmktplc*Fidcomerc - Parcela 7/12',
        accountName: 'Nubank Ultravioleta',
        installmentNumber: 7,
        installmentsTotal: 12,
        transactionTotalAmount: '732.84',
        installmentAmount: '61.07',
        daysUntilDue: -62,
        dueDate: '2026-05-01T12:00:00.000Z',
        amount: '61.07',
        kind: 'overdue',
        overdueDays: 62,
      },
      new Date('2026-07-02T16:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Boa tarde, Karoline!',
        '',
        '⚠️ Amazonmktplc*Fidcomerc',
        '7/12: R$ 61,07',
        'Vencida há 62 dias · 01/05/2026',
      ].join('\n')
    )
  })

  it('builds single alert with icons like batched messages', () => {
    const message = buildWhatsAppAlertMessage(
      {
        recipientName: 'Aline',
        transactionTitle: 'Mp *Ruivasstores',
        accountName: 'Nubank Empresa',
        daysUntilDue: 2,
        dueDate: '2026-07-08T12:00:00.000Z',
        amount: '4000.00',
        transactionTotalAmount: '8000.00',
        splitAmount: '4000.00',
        kind: 'split_upcoming',
        isSplit: true,
        isCreditCardInvoice: true,
      },
      new Date('2026-07-06T16:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Boa tarde, Aline!',
        '',
        '💳 Nubank Empresa',
        'Fatura Vence em 2 dias · 08/07/2026',
        '',
        '🧾 Mp *Ruivasstores',
        'Sua parte: R$ 4000,00',
        'Compra R$ 8000,00 · Dividido pra 2',
      ].join('\n')
    )
  })

  it('builds split installment alert for Karoline', () => {
    const message = buildWhatsAppAlertMessage(
      {
        recipientName: 'Karoline',
        transactionTitle: 'Pia da cozinha - Parcela 1/3',
        accountName: 'Transações Nubank',
        installmentNumber: 1,
        installmentsTotal: 3,
        transactionTotalAmount: '900.00',
        splitAmount: '450.00',
        splitShareInstallmentAmount: '150.00',
        splitPaidAmount: '150.00',
        splitRemainingAmount: '300.00',
        splitParticipantCount: 2,
        daysUntilDue: 0,
        dueDate: '2026-07-06T12:00:00.000Z',
        amount: '300.00',
        kind: 'split_upcoming',
        isSplit: true,
      },
      new Date('2026-07-06T18:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Boa tarde, Karoline!',
        '',
        '📅 Pia da cozinha',
        '1/3: R$ 150,00',
        'Compra R$ 900,00 · Dividido pra 2',
        'Vence hoje · 06/07/2026',
      ].join('\n')
    )
  })

  it('builds imported split installment alert with purchase total', () => {
    const message = buildWhatsAppAlertMessage(
      {
        recipientName: 'Karoline',
        transactionTitle: 'Casas Bahia - NuPay - Parcela 1/10',
        accountName: 'Nubank Ultravioleta',
        installmentNumber: 1,
        installmentsTotal: 10,
        transactionTotalAmount: '1675.10',
        splitAmount: '837.50',
        splitShareInstallmentAmount: '83.75',
        splitPaidAmount: '0.00',
        splitRemainingAmount: '837.50',
        splitParticipantCount: 2,
        daysUntilDue: 9,
        dueDate: '2026-07-17T12:00:00.000Z',
        amount: '837.50',
        kind: 'split_upcoming',
        isSplit: true,
        isCreditCardInvoice: true,
      },
      new Date('2026-07-08T11:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Bom dia, Karoline!',
        '',
        '💳 Nubank Ultravioleta',
        'Fatura Vence em 9 dias · 17/07/2026',
        '',
        '🧾 Casas Bahia - NuPay',
        '1/10: R$ 83,75',
        'Compra R$ 1675,10 · Dividido pra 2',
      ].join('\n')
    )
  })

  it('builds batched WhatsApp message for multiple alerts', () => {
    const message = buildWhatsAppBatchAlertMessage(
      {
        recipientName: 'Fagner Gomes',
        items: [
          {
            transactionTitle: 'CEMIG',
            dueLine: 'Vence em 2 dias · 08/07/2026',
            note: 'Pagar energia',
            daysUntilDue: 2,
            kind: 'upcoming',
          },
          {
            transactionTitle: 'Vivo',
            dueLine: 'Vence hoje · 06/07/2026',
            amount: '64.00',
            transactionTotalAmount: '64.00',
            daysUntilDue: 0,
            kind: 'upcoming',
          },
        ],
      },
      new Date('2026-07-02T12:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Bom dia, Fagner!',
        '',
        '🧾 CEMIG',
        'Vence em 2 dias · 08/07/2026',
        '📝 Pagar energia',
        '',
        WHATSAPP_BATCH_SEPARATOR,
        '',
        '📅 Vivo',
        'R$ 64,00',
        'Vence hoje · 06/07/2026',
      ].join('\n')
    )
  })

  it('groups credit card transactions by card name and due date', () => {
    const message = buildWhatsAppBatchAlertMessage(
      {
        recipientName: 'Aline',
        items: [
          {
            transactionTitle: 'Asa*Casaldentistabh',
            accountName: 'Nubank Empresa',
            isCreditCardInvoice: true,
            amount: '1350.00',
            dueLine: 'Fatura Vence em 2 dias · 08/07/2026',
            daysUntilDue: 2,
            kind: 'upcoming',
          },
          {
            transactionTitle: 'Emprestimo',
            amount: '250.00',
            transactionTotalAmount: '1000.00',
            installmentNumber: 1,
            installmentsTotal: 4,
            dueLine: 'Vence hoje · 06/07/2026',
            daysUntilDue: 0,
            kind: 'upcoming',
          },
          {
            transactionTitle: 'Mp *Ruivasstores',
            accountName: 'Nubank Empresa',
            isCreditCardInvoice: true,
            amount: '4000.00',
            transactionTotalAmount: '8000.00',
            splitAmount: '4000.00',
            splitParticipantCount: 2,
            isSplit: true,
            dueLine: 'Fatura Vence em 2 dias · 08/07/2026',
            daysUntilDue: 2,
            kind: 'split_upcoming',
          },
        ],
      },
      new Date('2026-07-06T16:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Boa tarde, Aline!',
        '',
        '💳 Nubank Empresa',
        'Fatura Vence em 2 dias · 08/07/2026',
        '',
        '🧾 Asa*Casaldentistabh',
        'R$ 1350,00',
        '',
        '🧾 Mp *Ruivasstores',
        'Sua parte: R$ 4000,00',
        'Compra R$ 8000,00 · Dividido pra 2',
        '',
        WHATSAPP_BATCH_SEPARATOR,
        '',
        '📅 Emprestimo',
        '1/4: R$ 250,00',
        'Vence hoje · 06/07/2026',
      ].join('\n')
    )
  })

  it('builds batched split message for Karoline', () => {
    const message = buildWhatsAppBatchAlertMessage(
      {
        recipientName: 'Karoline Mayra',
        items: [
          {
            transactionTitle: 'Papelaria Santa Ines',
            accountName: 'Nubank Cartão',
            isCreditCardInvoice: true,
            summaryLine: 'Sua parte: R$ 3,00',
            dueLine: 'Fatura Vence em 11 dias · 17/07/2026',
            amount: '3.00',
            daysUntilDue: 11,
            kind: 'split_upcoming',
          },
          {
            transactionTitle: 'Posto de Combustiveis',
            accountName: 'Nubank Cartão',
            isCreditCardInvoice: true,
            summaryLine: 'Sua parte: R$ 12,50',
            dueLine: 'Fatura Vence em 11 dias · 17/07/2026',
            amount: '12.50',
            daysUntilDue: 11,
            kind: 'split_upcoming',
          },
        ],
      },
      new Date('2026-07-06T12:00:00.000Z')
    )

    expect(message).toBe(
      [
        'Bom dia, Karoline!',
        '',
        '💳 Nubank Cartão',
        'Fatura Vence em 11 dias · 17/07/2026',
        '',
        '🧾 Papelaria Santa Ines',
        'Sua parte: R$ 3,00',
        '',
        '🧾 Posto de Combustiveis',
        'Sua parte: R$ 12,50',
      ].join('\n')
    )
  })
})
