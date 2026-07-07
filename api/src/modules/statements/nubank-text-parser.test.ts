import { describe, expect, it } from 'vitest'

import {
  parseNubankMetadataFromText,
  parseNubankTransactionsFromText,
} from '@/modules/statements/nubank-text-parser'

const SAMPLE = `
RESUMO DA FATURA ATUAL
Fatura anterior R$ 6.104,49
Pagamento recebido −R$ 6.104,49
Total de compras de todos os cartões, 01 MAI a 01 JUN R$ 6.126,68
Outros lançamentos R$ 856,93
Total a pagar R$ 6.983,61
Pagamento mínimo para não ficar em atraso R$ 1.047,54
Data de vencimento: 08 JUN 2026
Período vigente: 01 MAI a 01 JUN
TRANSAÇÕES DE 01 MAI A 01 JUN
01 MAI Mgpower - Parcela 3/3 R$ 405,78
05 MAI Pagamento em 05 MAI −R$ 500,00
31 MAI Zig* *Zigpay R$ 40,00
`

describe('parseNubankTransactionsFromText', () => {
  it('extracts transactions and metadata from Nubank text', () => {
    const transactions = parseNubankTransactionsFromText(SAMPLE, 2026)
    const meta = parseNubankMetadataFromText(SAMPLE)

    expect(transactions).toHaveLength(3)
    expect(transactions[0]?.title).toBe('Mgpower - Parcela 3/3')
    expect(transactions[0]?.installmentNumber).toBe(3)
    expect(transactions[1]?.type).toBe('income')
    expect(meta.totalAmount).toBe('6983.61')
    expect(meta.dueDate).toContain('2026-06-08')
  })

  it('does not treat repeated section headers as transactions', () => {
    const text = `
TRANSAÇÕES DE 01 ABR A 01 MAI
01 ABR Mgpower - Parcela 2/3 R$ 405,78
TRANSAÇÕES DE 01 ABR A 01 MAI
08 ABR Pagamento em 08 ABR −R$ 5.828,84
`

    const transactions = parseNubankTransactionsFromText(text, 2026)
    const payment = transactions.find(item => /pagamento em 08 abr/i.test(item.title))

    expect(transactions).toHaveLength(2)
    expect(payment?.date).toBe('2026-04-08T12:00:00.000Z')
    expect(payment?.amount).toBe('5828.84')
    expect(payment?.type).toBe('income')
  })
})
