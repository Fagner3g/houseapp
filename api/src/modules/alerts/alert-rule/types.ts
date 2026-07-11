import type {
  AlertRuleChannel,
  AlertRuleConfig,
  AlertRuleScope,
  AlertRuleTriggerType,
} from '@/db/schemas/alertRules'
import type { TransactionNotifyOverdueConfig } from '@/db/schemas/transactions'

export type AlertEvaluateMode = 'all' | 'upcoming' | 'overdue'

export type ManualAlertType = 'overdue' | 'upcoming' | 'monthly-summary'

export type ManualAlertTarget = {
  key: string
  name: string
  type: 'member' | 'contact'
  phone: string | null
  userId: string | null
}

export type EvaluateOrganizationOptions = {
  skipTimeCheck?: boolean
  targetUserId?: string
  skipOverdueThrottle?: boolean
}

export type ManualAlertItem = {
  transactionId: string
  daysUntilDue: number
  kind: 'upcoming' | 'overdue'
  overdueDays?: number
  amountOverride?: string | null
  isSplit?: boolean
  splitId?: string | null
}

export type AlertRuleDto = {
  id: string
  organizationId: string
  scope: AlertRuleScope
  accountId: string | null
  recurringTransactionId: string | null
  triggerType: AlertRuleTriggerType
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CreateAlertRuleInput = {
  organizationId: string
  createdBy: string
  scope: AlertRuleScope
  accountId?: string | null
  recurringTransactionId?: string | null
  triggerType: AlertRuleTriggerType
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
}

export type UpdateAlertRuleInput = {
  config?: AlertRuleConfig
  channels?: AlertRuleChannel[]
  isActive?: boolean
}

export type RuleMatchTransaction = {
  id: string
  organizationId: string
  accountId: string | null
  recurringTransactionId: string | null
  title: string
  amount: bigint | null
  date: Date
}

export type PendingTransactionRow = RuleMatchTransaction & {
  competenceDate: Date | null
  type: 'income' | 'expense' | 'transfer'
  installmentNumber: number | null
  accountType: string | null
  closingDay: number | null
  dueDay: number | null
  notifyEnabled: boolean
  notifyTargetType: 'member' | 'contact' | null
  notifyUserId: string | null
  notifyContactName: string | null
  notifyContactPhone: string | null
  notifyDaysBefore: number[] | null
  notifyOverdueConfig: TransactionNotifyOverdueConfig | null
}
