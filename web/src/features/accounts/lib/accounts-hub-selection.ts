import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import type { AccountsHubKind } from '@/features/accounts/components/accounts-hub-sub-nav'
import { isPaymentAccountType } from '@/features/accounts/constants'
import { currentBillingMonthKey } from '@/lib/billing-cycle'
import { currentMonthKey } from '@/lib/date-range'

export function defaultMonthForKind(kind: AccountsHubKind) {
  return kind === 'cards' ? currentBillingMonthKey() : currentMonthKey()
}

export function kindForAccount(account: ListAccounts200AccountsItem): AccountsHubKind | null {
  if (account.type === 'credit_card') return 'cards'
  if (isPaymentAccountType(account.type)) return 'accounts'
  return null
}

export function resolveHubSelectionPatch(args: {
  accounts: ListAccounts200AccountsItem[]
  accountId?: string
  kind: AccountsHubKind
  activeList: ListAccounts200AccountsItem[]
  previousMonth?: string
  previousInvoiceFilter?: string
}): Record<string, unknown> | null {
  const { accounts, accountId, kind, activeList, previousMonth, previousInvoiceFilter } = args

  if (!accounts.length) return null

  if (accountId) {
    const matched = accounts.find(account => account.id === accountId)
    if (matched) {
      const matchedKind = kindForAccount(matched)
      if (matchedKind && matchedKind !== kind) {
        return {
          kind: matchedKind,
          accountId: matched.id,
          month: previousMonth ?? defaultMonthForKind(matchedKind),
          invoiceFilter: matchedKind === 'cards' ? previousInvoiceFilter : undefined,
        }
      }
      if (activeList.some(account => account.id === accountId)) return null
    }
  }

  if (!activeList.length) return null

  const isValid = accountId && activeList.some(account => account.id === accountId)
  if (isValid) return null

  return {
    kind,
    accountId: activeList[0].id,
    month: previousMonth ?? defaultMonthForKind(kind),
  }
}
