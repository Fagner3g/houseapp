import { describe, expect, it } from 'vitest'

import {
  isCardStatementCreditTitle,
  isImportedBillPaymentTitle,
  isImportedInvoiceSettlementCredit,
} from './classifiers'

describe('isImportedBillPaymentTitle', () => {
  it('detects Nubank and Itaú bill payment lines', () => {
    expect(isImportedBillPaymentTitle('Pagamento recebido')).toBe(true)
    expect(isImportedBillPaymentTitle('Pagamento Debito Automatico')).toBe(true)
    expect(isImportedBillPaymentTitle('Pagamento Efetuado')).toBe(true)
    expect(isImportedBillPaymentTitle('Supermercados Bhcontagembr')).toBe(false)
  })
})

describe('isCardStatementCreditTitle', () => {
  it('detects Itaú automatic debit and manual payment credits', () => {
    expect(isCardStatementCreditTitle('Pagamento Debito Automatico')).toBe(true)
    expect(isCardStatementCreditTitle('Pagamento Efetuado')).toBe(true)
    expect(isCardStatementCreditTitle('Salário Empresa X')).toBe(false)
  })
})

describe('isImportedInvoiceSettlementCredit', () => {
  it('does not treat Itaú bill payments as settlement credits', () => {
    expect(isImportedInvoiceSettlementCredit({ title: 'Pagamento Debito Automatico' })).toBe(
      false
    )
    expect(
      isImportedInvoiceSettlementCredit({ title: 'Crédito de Confiança de "Loja X"' })
    ).toBe(true)
  })
})
