import type { ListSplits200SplitsItemStatus } from '@/api/generated/model'

export const SPLIT_STATUS_LABELS: Record<ListSplits200SplitsItemStatus, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  forgiven: 'Perdoado',
}

export const SPLIT_STATUS_VARIANT: Record<
  ListSplits200SplitsItemStatus,
  'warning' | 'partial' | 'default' | 'outline'
> = {
  pending: 'warning',
  partial: 'partial',
  paid: 'default',
  forgiven: 'outline',
}
