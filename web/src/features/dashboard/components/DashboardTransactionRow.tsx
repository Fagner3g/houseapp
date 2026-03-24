import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

interface DashboardTransactionRowProps {
  transaction: ListTransactions200TransactionsItem
  onEdit: (transaction: ListTransactions200TransactionsItem) => void
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'overdue' | 'upcoming'
}

export function DashboardTransactionRow({
  transaction,
  onEdit,
  children,
  className = '',
  variant = 'default',
}: DashboardTransactionRowProps) {
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
      className={`${baseClasses} cursor-pointer w-full text-left ${variantClasses[variant]} ${className}`}
      onClick={() => onEdit(transaction)}
    >
      {children}
    </button>
  )
}
