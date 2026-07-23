import { describe, expect, it } from 'vitest'

import {
  buildInvoiceSummariesForRange,
  buildOverdueInvoiceSummaries,
  mergeTransactionsWithInvoices,
} from './credit-card-invoice-rows'

describe('buildInvoiceSummariesForRange', () => {
  it('creates invoice row when due date falls in filter range and hides card purchases', () => {
    const nubankId = 'nubank-1'

    const { summaries, hiddenTransactionIds } = buildInvoiceSummariesForRange({
      creditCards: [
        {
          id: nubankId,
          name: 'Nubank Ultravioleta',
          type: 'credit_card',
          closingDay: 1,
          dueDay: 18,
        },
      ],
      statementsByAccountId: {
        [nubankId]: [
          {
            id: 'st-1',
            accountId: nubankId,
            organizationId: 'org',
            periodStart: '2026-06-02T12:00:00.000Z',
            periodEnd: '2026-07-01T12:00:00.000Z',
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-18T12:00:00.000Z',
            totalAmount: '6.06',
            minimumPayment: '6.06',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '6.06',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 4,
            fileHash: 'hash',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-07-01T00:00:00.000Z',
            isClosed: true,
            isPaid: false,
          },
        ],
      },
      transactions: [
        {
          id: 'tx-ifood',
          organizationId: 'org',
          accountId: nubankId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-1',
          title: 'iFood',
          description: null,
          amount: '0.67',
          type: 'expense',
          date: '2026-06-18T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-06-18T12:00:00.000Z',
          updatedAt: '2026-06-18T12:00:00.000Z',
        },
      ],
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.amount).toBe('6.06')
    expect(summaries[0]?.status).toBe('pending')
    expect(hiddenTransactionIds.has('tx-ifood')).toBe(true)
  })

  it('excludes August-due invoice from July filter while still hiding card purchases', () => {
    const nubankId = 'nubank-6115'

    const { summaries, hiddenTransactionIds } = buildInvoiceSummariesForRange({
      creditCards: [
        {
          id: nubankId,
          name: 'Nubank 6115',
          type: 'credit_card',
          closingDay: 1,
          dueDay: 18,
        },
      ],
      statementsByAccountId: {
        [nubankId]: [
          {
            id: 'st-1',
            accountId: nubankId,
            organizationId: 'org',
            periodStart: '2026-07-02T12:00:00.000Z',
            periodEnd: '2026-07-02T12:00:00.000Z',
            closingDate: '2026-07-02T12:00:00.000Z',
            dueDate: '2026-08-18T12:00:00.000Z',
            totalAmount: '-316.95',
            minimumPayment: '0',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: null,
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 7,
            fileHash: 'hash',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-07-02T00:00:00.000Z',
            isClosed: true,
            isPaid: false,
          },
        ],
      },
      transactions: [
        {
          id: 'tx-jul-1',
          organizationId: 'org',
          accountId: nubankId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-1',
          title: 'iFood - NuPay',
          description: null,
          amount: '0.90',
          type: 'expense',
          date: '2026-07-01T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-07-01T12:00:00.000Z',
          updatedAt: '2026-07-01T12:00:00.000Z',
        },
        {
          id: 'tx-jul-2',
          organizationId: 'org',
          accountId: nubankId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-1',
          title: 'Marcio Parafusos',
          description: null,
          amount: '26.00',
          type: 'expense',
          date: '2026-07-02T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-07-02T12:00:00.000Z',
          updatedAt: '2026-07-02T12:00:00.000Z',
        },
      ],
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(summaries.some(s => s.monthKey === '2026-08')).toBe(false)
    expect(summaries.every(s => !s.title.includes('agosto'))).toBe(true)
    expect(summaries.every(s => s.date.startsWith('2026-07'))).toBe(true)
    expect(hiddenTransactionIds.has('tx-jul-1')).toBe(true)
    expect(hiddenTransactionIds.has('tx-jul-2')).toBe(true)
  })

  it('lists overdue invoices by due date with open balance', () => {
    const nubankId = 'nubank-6115'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: nubankId,
          name: 'Nubank 6115',
          type: 'credit_card',
          closingDay: 1,
          dueDay: 10,
        },
      ],
      statementsByAccountId: {
        [nubankId]: [
          {
            id: 'st-1',
            accountId: nubankId,
            organizationId: 'org',
            periodStart: '2026-05-02T12:00:00.000Z',
            periodEnd: '2026-06-01T12:00:00.000Z',
            closingDate: '2026-06-01T12:00:00.000Z',
            dueDate: '2026-06-10T12:00:00.000Z',
            totalAmount: '150.00',
            minimumPayment: '150.00',
            previousBalance: '0',
            paymentsReceived: '50.00',
            purchasesTotal: '150.00',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 3,
            fileHash: 'hash',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-06-01T00:00:00.000Z',
            isClosed: true,
            isPaid: false,
          },
        ],
      },
      transactions: [
        {
          id: 'tx-1',
          organizationId: 'org',
          accountId: nubankId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-1',
          title: 'Pagamento recebido',
          description: null,
          amount: '50.00',
          type: 'income',
          date: '2026-06-05T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-06-05T12:00:00.000Z',
          updatedAt: '2026-06-05T12:00:00.000Z',
        },
      ],
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.title).toContain('Nubank 6115')
    expect(summaries[0]?.remaining).toBe('100.00')
    expect(summaries[0]?.overdueKind).toBe('bank')
  })

  it('lists paid invoice as overdue when cycle still has receivable splits', () => {
    const cardId = 'nubank-empresa'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: cardId,
          name: 'Nubank - Empresa',
          type: 'credit_card',
          closingDay: 1,
          dueDay: 8,
        },
      ],
      statementsByAccountId: {
        [cardId]: [
          {
            id: 'st-paid',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-05-27T12:00:00.000Z',
            periodEnd: '2026-06-30T12:00:00.000Z',
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-08T12:00:00.000Z',
            totalAmount: '5660.00',
            minimumPayment: '5660.00',
            previousBalance: '0',
            paymentsReceived: '5660.00',
            purchasesTotal: '5660.00',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 3,
            fileHash: 'hash',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-07-01T00:00:00.000Z',
            isClosed: true,
            isPaid: true,
          },
        ],
      },
      transactions: [
        {
          id: 'tx-karol',
          organizationId: 'org',
          accountId: cardId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-paid',
          title: 'Asa*Casaldentistabh',
          description: null,
          amount: '1350.00',
          type: 'expense',
          date: '2026-06-15T12:00:00.000Z',
          competenceDate: '2026-06-15T12:00:00.000Z',
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-06-15T12:00:00.000Z',
          updatedAt: '2026-06-15T12:00:00.000Z',
        },
        {
          id: 'tx-payment',
          organizationId: 'org',
          accountId: cardId,
          cardId: null,
          recurringTransactionId: null,
          statementId: null,
          title: 'Pagamento recebido',
          description: null,
          amount: '5660.00',
          type: 'income',
          date: '2026-07-08T12:00:00.000Z',
          competenceDate: null,
          status: 'paid',
          paidAt: '2026-07-08T12:00:00.000Z',
          paidAmount: '5660.00',
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-07-08T12:00:00.000Z',
          updatedAt: '2026-07-08T12:00:00.000Z',
        },
      ],
      receivables: [
        {
          transactionId: 'tx-karol',
          accountId: cardId,
          purchaseDate: '2026-06-15T12:00:00.000Z',
          remainingReais: 1350,
        },
      ],
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.overdueKind).toBe('receivable')
    expect(summaries[0]?.remaining).toBe('1350.00')
    expect(summaries[0]?.receivableRemaining).toBe('1350.00')
    expect(summaries[0]?.status).toBe('pending')
  })

  it('lists receivable overdue even without loading cycle transactions', () => {
    const cardId = 'nubank-empresa-slim'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: cardId,
          name: 'Nubank - Empresa',
          type: 'credit_card',
          closingDay: 9,
          dueDay: 16,
        },
      ],
      statementsByAccountId: {
        [cardId]: [
          {
            id: 'st-paid',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-05-27T12:00:00.000Z',
            periodEnd: '2026-07-01T12:00:00.000Z',
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-08T12:00:00.000Z',
            totalAmount: '5660.00',
            minimumPayment: '5660.00',
            previousBalance: '0',
            paymentsReceived: '5660.00',
            purchasesTotal: '5660.00',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 3,
            fileHash: 'hash',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-07-01T00:00:00.000Z',
            isClosed: true,
            isPaid: true,
          },
        ],
      },
      transactions: [],
      receivables: [
        {
          transactionId: 'tx-karol',
          accountId: cardId,
          purchaseDate: '2026-06-16T12:00:00.000Z',
          remainingReais: 1350,
        },
      ],
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.overdueKind).toBe('receivable')
    expect(summaries[0]?.remaining).toBe('1350.00')
    expect(summaries[0]?.title).toContain('Nubank - Empresa')
  })

  it('does not list paid invoice when there is no receivable remaining', () => {
    const cardId = 'nubank-empresa-clean'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: cardId,
          name: 'Nubank - Empresa',
          type: 'credit_card',
          closingDay: 1,
          dueDay: 8,
        },
      ],
      statementsByAccountId: {
        [cardId]: [
          {
            id: 'st-paid',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-05-27T12:00:00.000Z',
            periodEnd: '2026-06-30T12:00:00.000Z',
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-08T12:00:00.000Z',
            totalAmount: '5660.00',
            minimumPayment: '5660.00',
            previousBalance: '0',
            paymentsReceived: '5660.00',
            purchasesTotal: '5660.00',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 1,
            fileHash: 'hash',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-07-01T00:00:00.000Z',
            isClosed: true,
            isPaid: true,
          },
        ],
      },
      transactions: [
        {
          id: 'tx-paid-split',
          organizationId: 'org',
          accountId: cardId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-paid',
          title: 'Compra quitada',
          description: null,
          amount: '100.00',
          type: 'expense',
          date: '2026-06-10T12:00:00.000Z',
          competenceDate: '2026-06-10T12:00:00.000Z',
          status: 'paid',
          paidAt: '2026-07-08T12:00:00.000Z',
          paidAmount: '100.00',
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-06-10T12:00:00.000Z',
          updatedAt: '2026-07-08T12:00:00.000Z',
        },
      ],
      receivables: [],
    })

    expect(summaries).toHaveLength(0)
  })

  it('lists paid Empresa-style invoice with receivable amid duplicate OFX statements', () => {
    const cardId = 'nubank-empresa-multi-st'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: cardId,
          name: 'Nubank - Empresa',
          type: 'credit_card',
          closingDay: 9,
          dueDay: 16,
        },
      ],
      statementsByAccountId: {
        [cardId]: [
          {
            id: 'st-july',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-05-27T12:00:00.000Z',
            periodEnd: '2026-07-01T12:00:00.000Z',
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-08T12:00:00.000Z',
            totalAmount: '5660.00',
            minimumPayment: '5660.00',
            previousBalance: '0',
            paymentsReceived: '5660.00',
            purchasesTotal: '5660.00',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 3,
            fileHash: 'hash-july',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-07-01T00:00:00.000Z',
            isClosed: true,
            isPaid: true,
          },
          {
            id: 'st-aug-ofx',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-07-01T12:00:00.000Z',
            periodEnd: '2026-08-01T12:00:00.000Z',
            closingDate: '2026-08-01T12:00:00.000Z',
            dueDate: '2026-08-08T12:00:00.000Z',
            totalAmount: '130.40',
            minimumPayment: '130.40',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '130.40',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 1,
            fileHash: 'hash-aug-ofx',
            fileName: 'f.ofx',
            importedBy: null,
            importedAt: '2026-08-01T00:00:00.000Z',
            isClosed: false,
            isPaid: false,
          },
          {
            id: 'st-aug-pdf',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-07-01T12:00:00.000Z',
            periodEnd: '2026-08-09T12:00:00.000Z',
            closingDate: '2026-08-09T12:00:00.000Z',
            dueDate: '2026-08-16T12:00:00.000Z',
            totalAmount: '5793.59',
            minimumPayment: '5793.59',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '5793.59',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 10,
            fileHash: 'hash-aug-pdf',
            fileName: 'f.pdf',
            importedBy: null,
            importedAt: '2026-08-09T00:00:00.000Z',
            isClosed: false,
            isPaid: false,
          },
        ],
      },
      transactions: [],
      receivables: [
        {
          transactionId: 'tx-karol',
          accountId: cardId,
          purchaseDate: '2026-06-16T12:00:00.000Z',
          remainingReais: 1350,
        },
      ],
    })

    const empresa = summaries.filter(s => s.accountId === cardId)
    expect(empresa.some(s => s.overdueKind === 'receivable')).toBe(true)
    expect(empresa.find(s => s.overdueKind === 'receivable')?.remaining).toBe('1350.00')
  })

  it('does not create a phantom overdue invoice when OFX closing day differs from account', () => {
    const nubankId = 'nubank-uv'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: nubankId,
          name: 'Nubank Ultravioleta',
          type: 'credit_card',
          closingDay: 10,
          dueDay: 17,
        },
      ],
      statementsByAccountId: {
        [nubankId]: [
          {
            id: 'st-april',
            accountId: nubankId,
            organizationId: 'org',
            periodStart: '2026-03-01T12:00:00.000Z',
            periodEnd: '2026-04-01T12:00:00.000Z',
            closingDate: '2026-04-01T12:00:00.000Z',
            dueDate: '2026-04-08T12:00:00.000Z',
            totalAmount: '5828.83',
            minimumPayment: '5828.83',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '5836.51',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 64,
            fileHash: 'hash',
            fileName: 'Nubank_2026-04-08.ofx',
            importedBy: null,
            importedAt: '2026-04-01T00:00:00.000Z',
            isClosed: true,
            isPaid: false,
          },
        ],
      },
      transactions: [
        {
          id: 'tx-mar-1',
          organizationId: 'org',
          accountId: nubankId,
          cardId: null,
          recurringTransactionId: null,
          statementId: 'st-april',
          title: 'Compra março',
          description: null,
          amount: '2281.17',
          type: 'expense',
          date: '2026-03-01T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'import',
          categoryIds: [],
          createdAt: '2026-03-01T12:00:00.000Z',
          updatedAt: '2026-03-01T12:00:00.000Z',
        },
        {
          id: 'tx-pay-april',
          organizationId: 'org',
          accountId: nubankId,
          cardId: null,
          recurringTransactionId: null,
          statementId: null,
          title: 'Pagamento fatura',
          description: null,
          amount: '5828.83',
          type: 'income',
          date: '2026-04-08T12:00:00.000Z',
          competenceDate: null,
          status: 'paid',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'manual',
          categoryIds: [],
          createdAt: '2026-04-08T12:00:00.000Z',
          updatedAt: '2026-04-08T12:00:00.000Z',
        },
      ],
    })

    expect(summaries.some(summary => summary.monthKey === '2026-03')).toBe(false)
    expect(summaries.some(summary => summary.monthKey === '2026-04')).toBe(false)
  })

  it('lists Empresa July receivable with API statement order (newest import first)', () => {
    const cardId = 's7o2dctaa5oju5diyvcoyfmf'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: cardId,
          name: 'Nubank - Empresa',
          type: 'credit_card',
          closingDay: 9,
          dueDay: 16,
        },
      ],
      statementsByAccountId: {
        [cardId]: [
          {
            id: 'st-aug-pdf',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-07-01T12:00:00.000Z',
            periodEnd: '2026-08-09T12:00:00.000Z',
            closingDate: '2026-08-09T12:00:00.000Z',
            dueDate: '2026-08-16T12:00:00.000Z',
            totalAmount: '5793.59',
            minimumPayment: '5793.59',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '5793.59',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 10,
            fileHash: 'hash-aug-pdf',
            fileName: 'Nubank_2026-08-16.ofx',
            importedBy: null,
            importedAt: '2026-07-22T23:02:44.230Z',
            isClosed: false,
            isPaid: false,
            importSource: 'ofx',
          },
          {
            id: 'st-aug-ofx',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-07-01T12:00:00.000Z',
            periodEnd: '2026-08-01T12:00:00.000Z',
            closingDate: '2026-08-01T12:00:00.000Z',
            dueDate: '2026-08-08T12:00:00.000Z',
            totalAmount: '130.40',
            minimumPayment: '130.40',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '130.40',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 1,
            fileHash: 'hash-aug-ofx',
            fileName: 'Nubank_2026-08-08.ofx',
            importedBy: null,
            importedAt: '2026-07-11T13:29:28.863Z',
            isClosed: false,
            isPaid: false,
            importSource: 'ofx',
          },
          {
            id: 'st-july',
            accountId: cardId,
            organizationId: 'org',
            periodStart: '2026-05-27T12:00:00.000Z',
            periodEnd: '2026-07-01T12:00:00.000Z',
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-08T12:00:00.000Z',
            totalAmount: '5660.00',
            minimumPayment: '5660.00',
            previousBalance: '0',
            paymentsReceived: '5660.00',
            purchasesTotal: '5660.00',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 3,
            fileHash: 'hash-july',
            fileName: 'Nubank_2026-07-08.ofx',
            importedBy: null,
            importedAt: '2026-07-11T13:28:15.600Z',
            isClosed: true,
            isPaid: true,
            importSource: 'ofx',
          },
        ],
      },
      transactions: [],
      receivables: [
        {
          transactionId: 'rid4w6xwlzc9bkn6d22jljar',
          accountId: cardId,
          purchaseDate: '2026-06-16T12:00:00.000Z',
          remainingReais: 1350,
        },
      ],
    })

    const july = summaries.find(s => s.monthKey === '2026-07')
    expect(july?.overdueKind).toBe('receivable')
    expect(july?.remaining).toBe('1350.00')
    expect(july?.title).toContain('Nubank - Empresa')
  })

  it('lists receivable when next OFX previousBalance is 0 (bank settled, splits open)', () => {
    const nubankId = 'nubank-uv-july'

    const summaries = buildOverdueInvoiceSummaries({
      creditCards: [
        {
          id: nubankId,
          name: 'Nubank Ultravioleta',
          type: 'credit_card',
          closingDay: 10,
          dueDay: 17,
        },
      ],
      statementsByAccountId: {
        [nubankId]: [
          {
            id: 'st-july',
            accountId: nubankId,
            organizationId: 'org',
            periodStart: '2026-06-01T12:00:00.000Z',
            periodEnd: '2026-07-10T12:00:00.000Z',
            closingDate: '2026-07-10T12:00:00.000Z',
            dueDate: '2026-07-17T12:00:00.000Z',
            totalAmount: '6030.35',
            minimumPayment: '6030.35',
            previousBalance: '0',
            paymentsReceived: '2150.00',
            purchasesTotal: '7025.12',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 10,
            fileHash: 'hash-july',
            fileName: 'Nubank_2026-07-17.ofx',
            importedBy: null,
            importedAt: '2026-07-17T00:00:00.000Z',
            isClosed: true,
            isPaid: false,
            importSource: 'ofx',
          },
          {
            id: 'st-august',
            accountId: nubankId,
            organizationId: 'org',
            periodStart: '2026-07-10T12:00:00.000Z',
            periodEnd: '2026-08-10T12:00:00.000Z',
            closingDate: '2026-08-10T12:00:00.000Z',
            dueDate: '2026-08-17T12:00:00.000Z',
            totalAmount: '2504.87',
            minimumPayment: '2504.87',
            previousBalance: '0',
            paymentsReceived: '0',
            purchasesTotal: '2504.87',
            otherCharges: '0',
            nextInvoiceBalance: null,
            totalOpenBalance: null,
            transactionsCount: 5,
            fileHash: 'hash-aug',
            fileName: 'Nubank_2026-08-17.ofx',
            importedBy: null,
            importedAt: '2026-08-10T00:00:00.000Z',
            isClosed: false,
            isPaid: false,
            importSource: 'ofx',
          },
        ],
      },
      transactions: [],
      receivables: [
        {
          transactionId: 'tx-split',
          accountId: nubankId,
          purchaseDate: '2026-06-20T12:00:00.000Z',
          remainingReais: 755.74,
        },
      ],
    })

    const july = summaries.find(summary => summary.monthKey === '2026-07')
    expect(july?.overdueKind).toBe('receivable')
    expect(july?.remaining).toBe('755.74')
  })
})

describe('mergeTransactionsWithInvoices', () => {
  it('drops rows whose displayed date is outside the selected period', () => {
    const merged = mergeTransactionsWithInvoices(
      [
        {
          id: 'tx-in',
          organizationId: 'org',
          accountId: 'acc-1',
          cardId: null,
          recurringTransactionId: null,
          statementId: null,
          title: 'In range',
          description: null,
          amount: '10.00',
          type: 'expense',
          date: '2026-07-15T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'manual',
          categoryIds: [],
          createdAt: '2026-07-15T12:00:00.000Z',
          updatedAt: '2026-07-15T12:00:00.000Z',
        },
        {
          id: 'tx-out',
          organizationId: 'org',
          accountId: 'acc-1',
          cardId: null,
          recurringTransactionId: null,
          statementId: null,
          title: 'Out of range',
          description: null,
          amount: '20.00',
          type: 'expense',
          date: '2026-08-08T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'manual',
          categoryIds: [],
          createdAt: '2026-08-08T12:00:00.000Z',
          updatedAt: '2026-08-08T12:00:00.000Z',
        },
      ],
      [
        {
          kind: 'invoice_summary',
          id: 'invoice-aug',
          accountId: 'cc-1',
          accountName: 'Nubank',
          monthKey: '2026-08',
          title: 'Fatura Nubank — agosto de 2026',
          amount: '100.00',
          payments: '0.00',
          remaining: '100.00',
          type: 'expense',
          date: '2026-08-17T12:00:00.000Z',
          status: 'pending',
        },
        {
          kind: 'invoice_summary',
          id: 'invoice-jul',
          accountId: 'cc-1',
          accountName: 'Nubank',
          monthKey: '2026-07',
          title: 'Fatura Nubank — julho de 2026',
          amount: '50.00',
          payments: '0.00',
          remaining: '50.00',
          type: 'expense',
          date: '2026-07-17T12:00:00.000Z',
          status: 'pending',
        },
      ],
      new Set(),
      '2026-07-01',
      '2026-07-31'
    )

    expect(merged.map(item => item.id)).toEqual(['invoice-jul', 'tx-in'])
  })

  it('keeps payables whose due date is outside the period but schedule falls inside', () => {
    const merged = mergeTransactionsWithInvoices(
      [
        {
          id: 'tx-scheduled',
          organizationId: 'org',
          accountId: 'acc-1',
          cardId: null,
          recurringTransactionId: null,
          statementId: null,
          title: 'Empréstimo',
          description: null,
          amount: '500.00',
          type: 'expense',
          date: '2026-06-20T12:00:00.000Z',
          competenceDate: null,
          status: 'pending',
          paidAt: null,
          paidAmount: null,
          paymentScheduledAt: '2026-07-20T23:59:59.999Z',
          counterparty: null,
          installmentNumber: null,
          installmentsTotal: null,
          source: 'manual',
          categoryIds: [],
          createdAt: '2026-06-20T12:00:00.000Z',
          updatedAt: '2026-06-20T12:00:00.000Z',
        },
      ],
      [],
      new Set(),
      '2026-07-01',
      '2026-07-31'
    )

    expect(merged.map(item => item.id)).toEqual(['tx-scheduled'])
  })
})
