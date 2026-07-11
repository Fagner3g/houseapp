import dayjs from 'dayjs'

import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'
import { centsToReais, formatCurrency } from '@/lib/currency'

import { remainingSplitCents } from './money'
import type { KpiSummaryItem } from './types'

type ChildItem = KpiSummaryItem & { sortDate: string }

type PersonGroup = {
  label: string
  periodRemainingCents: number
  totalRemainingCents: number
  periodChildren: ChildItem[]
  outOfPeriodChildren: ChildItem[]
}

function pendingSplitPersonKey(split: ListPendingSplits200SplitsItem): string {
  if (split.userId) return `user:${split.userId}`
  const name = (split.personName ?? split.contactName ?? 'Contato').trim().toLowerCase()
  return `name:${name}`
}

function pendingSplitPersonLabel(split: ListPendingSplits200SplitsItem): string {
  return split.personName ?? split.contactName ?? 'Contato'
}

function isTransactionDateInRange(date: string, dateFrom: string, dateTo: string) {
  const d = dayjs(date)
  return !d.isBefore(dayjs(dateFrom).startOf('day')) && !d.isAfter(dayjs(dateTo).endOf('day'))
}

function sortChildren(children: ChildItem[]): KpiSummaryItem[] {
  return [...children]
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    .map(child => {
      const { sortDate: _sortDate, ...item } = child
      return item
    })
}

function countMeta(count: number) {
  return count === 1 ? '1 lançamento' : `${count} lançamentos`
}

function toPersonItem(
  key: string,
  group: PersonGroup,
  mode: 'period' | 'outOfPeriod'
): KpiSummaryItem {
  const children =
    mode === 'period'
      ? sortChildren(group.periodChildren)
      : sortChildren(group.outOfPeriodChildren)
  const amountCents =
    mode === 'period' ? group.periodRemainingCents : group.totalRemainingCents
  const showFullSubtitle =
    mode === 'period' && group.totalRemainingCents > group.periodRemainingCents

  return {
    id: key,
    title: group.label,
    subtitle: showFullSubtitle
      ? `Total em aberto: ${formatCurrency(centsToReais(group.totalRemainingCents))}`
      : undefined,
    meta: countMeta(children.length),
    amountLabel: formatCurrency(centsToReais(amountCents)),
    amountClassName: 'text-amber-600',
    children,
  }
}

/** Groups pending splits by person: period amount primary, full outstanding as subtitle. */
export function mapPendingSplitKpiItems(input: {
  splits: ListPendingSplits200SplitsItem[]
  dateFrom: string
  dateTo: string
  onOpenTransaction: (id: string) => void
}): { items: KpiSummaryItem[]; secondaryItems: KpiSummaryItem[] } {
  const groups = new Map<string, PersonGroup>()

  for (const split of input.splits) {
    const key = pendingSplitPersonKey(split)
    const remainingCents = remainingSplitCents(split.amount, split.paidAmount)
    const inPeriod = isTransactionDateInRange(
      split.transactionDate,
      input.dateFrom,
      input.dateTo
    )
    const child: ChildItem = {
      id: split.id,
      title: split.transactionTitle,
      meta: `${dayjs(split.transactionDate).format('DD/MM/YYYY')}${
        split.status === 'partial' ? ' · parcial' : ''
      }`,
      amountLabel: formatCurrency(centsToReais(remainingCents)),
      amountClassName: 'text-amber-600',
      onClick: () => input.onOpenTransaction(split.transactionId),
      sortDate: split.transactionDate,
    }

    const existing = groups.get(key)
    if (existing) {
      existing.totalRemainingCents += remainingCents
      if (inPeriod) {
        existing.periodRemainingCents += remainingCents
        existing.periodChildren.push(child)
      } else {
        existing.outOfPeriodChildren.push(child)
      }
    } else {
      groups.set(key, {
        label: pendingSplitPersonLabel(split),
        periodRemainingCents: inPeriod ? remainingCents : 0,
        totalRemainingCents: remainingCents,
        periodChildren: inPeriod ? [child] : [],
        outOfPeriodChildren: inPeriod ? [] : [child],
      })
    }
  }

  const items: KpiSummaryItem[] = []
  const secondaryItems: KpiSummaryItem[] = []

  for (const [key, group] of groups) {
    if (group.periodChildren.length > 0) {
      items.push(toPersonItem(key, group, 'period'))
    } else {
      secondaryItems.push(toPersonItem(key, group, 'outOfPeriod'))
    }
  }

  items.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  secondaryItems.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))

  return { items, secondaryItems }
}
