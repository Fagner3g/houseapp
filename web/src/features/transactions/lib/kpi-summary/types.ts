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

export type KpiBreakdownLine = {
  label: string
  value: string
  className?: string
  emphasis?: boolean
  prefix?: string
}

export type KpiDialogView = {
  title: string
  description: string
  totalLabel: string
  total: string
  totalClassName?: string
  breakdown?: KpiBreakdownLine[]
  itemsLabel?: string
  items: KpiSummaryItem[]
  secondaryItemsLabel?: string
  secondaryItems?: KpiSummaryItem[]
  isLoading?: boolean
  emptyMessage: string
  footerHint?: string
}
