import { Link } from '@tanstack/react-router'

import type { GetReportByAccount200AccountsItem } from '@/api/generated/model'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { ACCOUNT_TYPE_SINGULAR, accountTypeIcon, formatCardCount } from '../constants'

interface AccountCardProps {
  account: GetReportByAccount200AccountsItem
  slug: string
  extra?: {
    creditLimit?: string | null
    dueDay?: number | null
    closingDay?: number | null
    cardCount?: number
  }
}

export function AccountCard({ account, slug, extra }: AccountCardProps) {
  const Icon = accountTypeIcon(account.type)
  const balance = Number(account.balance)
  const isCredit = account.type === 'credit_card'

  return (
    <Link
      to={`/${slug}/accounts/${account.accountId}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="size-5 text-slate-700" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {ACCOUNT_TYPE_SINGULAR[account.type] ?? account.type}
            </p>
            <p className="font-semibold text-slate-900">{account.name}</p>
            {isCredit && extra?.dueDay != null && (
              <p className="text-sm text-slate-500">
                Vence dia {extra.dueDay}
                {extra.closingDay != null ? ` · Fecha dia ${extra.closingDay}` : ''}
              </p>
            )}
          </div>
        </div>
        <p
          className={cn(
            'text-lg font-bold tabular-nums',
            balance < 0 ? 'text-rose-600' : 'text-slate-900'
          )}
        >
          {formatCentsString(account.balance)}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
        {isCredit && extra?.creditLimit && (
          <span>Limite: {formatCentsString(extra.creditLimit)}</span>
        )}
        {isCredit && extra?.cardCount != null && extra.cardCount > 0 && (
          <span>{formatCardCount(extra.cardCount)}</span>
        )}
      </div>
    </Link>
  )
}
