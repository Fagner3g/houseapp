import type { AlertRuleLike } from '../alert-rule-config'
import type { ResidualTransaction } from './types'

export function residualTx(
  overrides: Partial<ResidualTransaction> & { id: string }
): ResidualTransaction {
  return {
    organizationId: 'org-1',
    accountId: null,
    accountName: null,
    title: 'Despesa',
    amount: 10000n,
    paidAmount: 0n,
    date: new Date('2026-07-01T15:00:00.000Z'),
    competenceDate: null,
    type: 'expense',
    installmentNumber: null,
    accountType: 'checking',
    closingDay: null,
    dueDay: null,
    notifyEnabled: false,
    cardId: null,
    cardUserId: null,
    transactionCreatedBy: null,
    accountCreatedBy: null,
    ...overrides,
  }
}

export function residualCcTx(
  overrides: Partial<ResidualTransaction> & { id: string; title: string }
): ResidualTransaction {
  return residualTx({
    accountId: 'card-1',
    accountName: 'Nubank',
    accountType: 'credit_card',
    closingDay: 1,
    dueDay: 10,
    date: new Date('2026-06-15T15:00:00.000Z'),
    competenceDate: new Date('2026-06-15T15:00:00.000Z'),
    amount: 5000n,
    ...overrides,
  })
}

export const residualUpcomingRule: AlertRuleLike = {
  id: 'rule-up',
  organizationId: 'org-1',
  scope: 'organization',
  accountId: null,
  recurringTransactionId: null,
  triggerType: 'upcoming',
  config: { daysBefore: [1, 3, 7] },
  channels: ['whatsapp'],
  isActive: true,
  createdBy: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const residualOverdueRule: AlertRuleLike = {
  id: 'rule-od',
  organizationId: 'org-1',
  scope: 'organization',
  accountId: null,
  recurringTransactionId: null,
  triggerType: 'overdue',
  config: { frequency: 'daily', interval: 1 },
  channels: ['whatsapp'],
  isActive: true,
  createdBy: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
}
