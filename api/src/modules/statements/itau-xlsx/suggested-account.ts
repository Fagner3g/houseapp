import { billingDaysFromStatementDates } from '@/core/billing-cycle'

import type { SuggestedCreditCardAccount } from '../nubank-ofx-parser'

const CARD_FINAL_SUFFIX = /\s+final\s+\d{4}$/i

export function suggestItauAccountName(cardName: string, cardLastFour: string | null): string {
  const trimmed = cardName.trim()
  if (!trimmed) return 'Itaú'

  const withoutFinal = trimmed.replace(CARD_FINAL_SUFFIX, '').trim()
  if (withoutFinal) return withoutFinal

  return cardLastFour ? `Itaú final ${cardLastFour}` : 'Itaú'
}

export function buildItauSuggestedAccount(input: {
  cardName: string
  cardLastFour: string | null
  closingDate: string
  dueDate: string
}): SuggestedCreditCardAccount {
  const { closingDay, dueDay } = billingDaysFromStatementDates(
    new Date(input.closingDate),
    new Date(input.dueDate)
  )

  return {
    name: suggestItauAccountName(input.cardName, input.cardLastFour),
    institution: 'itau',
    currency: 'BRL',
    closingDay,
    dueDay,
    creditLimit: null,
  }
}
