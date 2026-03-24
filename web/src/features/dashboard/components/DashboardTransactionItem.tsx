import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

type Props = {
  transaction: ListTransactions200TransactionsItem
  onEdit: (t: ListTransactions200TransactionsItem) => void
  variant?: 'default' | 'overdue' | 'upcoming'
  leftIcon: React.ReactNode
  title: string
  ownerName: string
  amount: number
  rightIcon: React.ReactNode
  rightPrimaryText: string
  rightSecondaryText: string
}

export function DashboardTransactionItem({
  transaction,
  onEdit,
  variant = 'default',
  leftIcon,
  title,
  ownerName,
  amount,
  rightIcon,
  rightPrimaryText,
  rightSecondaryText,
}: Props) {
  const baseClasses =
    'flex items-center justify-between p-4 border rounded-lg transition-all duration-200'
  const variantClasses = {
    default: 'hover:bg-muted/50',
    overdue:
      'border-red-200 bg-red-50/50 hover:bg-red-100/50 dark:border-red-800 dark:bg-red-950/20 dark:hover:bg-red-950/30',
    upcoming: 'hover:bg-muted/50',
  }

  return (
    <button
      type="button"
      className={`${baseClasses} cursor-pointer w-full text-left ${variantClasses[variant]}`}
      onClick={() => onEdit(transaction)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {leftIcon}
          <h4 className="font-medium text-foreground">{title}</h4>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{ownerName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">
              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end mb-1">
          {rightIcon}
          <span className="text-sm font-medium">{rightPrimaryText}</span>
        </div>
        <p className="text-xs text-muted-foreground">{rightSecondaryText}</p>
      </div>
    </button>
  )
}
