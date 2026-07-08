export type KpiKey = 'mySpend' | 'pendingSplits' | 'toPay' | 'toReceive' | 'overdue'

export type KpiSummaryItem = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  amountLabel: string
  amountClassName?: string
  onClick?: () => void
  /** When set, the dialog shows an expandable group instead of opening on click. */
  children?: KpiSummaryItem[]
}

export type KpiDialogView = {
  title: string
  description: string
  totalLabel: string
  total: string
  totalClassName?: string
  items: KpiSummaryItem[]
  isLoading?: boolean
  emptyMessage: string
  footerHint?: string
}
