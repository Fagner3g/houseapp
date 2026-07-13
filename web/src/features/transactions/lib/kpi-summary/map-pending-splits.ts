import dayjs from 'dayjs'

import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'
import { centsToReais, formatCurrency } from '@/lib/currency'

import { pendingSplitDisplayTitle } from '../pending-split-display-title'
import { remainingSplitCents } from './money'
import type { KpiSummaryItem } from './types'

type ChildItem = KpiSummaryItem & { sortDate: string }

type PersonGroup = {
  label: string
  /** Remaining through period end (past + current; excludes future). */
  dueRemainingCents: number
  totalRemainingCents: number
  dueChildren: ChildItem[]
  futureChildren: ChildItem[]
}

function pendingSplitPersonKey(split: ListPendingSplits200SplitsItem): string {
  if (split.userId) return `user:${split.userId}`
  const name = (split.personName ?? split.contactName ?? 'Contato').trim().toLowerCase()
  return `name:${name}`
}

function pendingSplitPersonLabel(split: ListPendingSplits200SplitsItem): string {
  return split.personName ?? split.contactName ?? 'Contato'
}

/** Due through period end: past and current; future parcels stay out. */
function isDueThroughPeriodEnd(date: string, dateTo: string) {
  return !dayjs(date).isAfter(dayjs(dateTo).endOf('day'))
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
  mode: 'due' | 'future'
): KpiSummaryItem {
  const children =
    mode === 'due' ? sortChildren(group.dueChildren) : sortChildren(group.futureChildren)
  const amountCents = mode === 'due' ? group.dueRemainingCents : group.totalRemainingCents
  const showFullSubtitle =
    mode === 'due' && group.totalRemainingCents > group.dueRemainingCents

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

/**
 * Groups pending splits by person.
 * Primary amount = remaining through period end (includes past/overdue).
 * Secondary = people with only future parcels (after period end).
 */
export function mapPendingSplitKpiItems(input: {
  splits: ListPendingSplits200SplitsItem[]
  dateTo: string
  onOpenTransaction: (id: string) => void
}): { items: KpiSummaryItem[]; secondaryItems: KpiSummaryItem[] } {
  const groups = new Map<string, PersonGroup>()

  for (const split of input.splits) {
    const key = pendingSplitPersonKey(split)
    const remainingCents = remainingSplitCents(split.amount, split.paidAmount)
    const isDue = isDueThroughPeriodEnd(split.transactionDate, input.dateTo)
    const child: ChildItem = {
      id: split.id,
      title: pendingSplitDisplayTitle(split.transactionTitle, split.collectLumpSum),
      meta: [
        dayjs(split.transactionDate).format('DD/MM/YYYY'),
        split.collectLumpSum ? 'à vista' : null,
        split.status === 'partial' ? 'parcial' : null,
      ]
        .filter(Boolean)
        .join(' · '),
      amountLabel: formatCurrency(centsToReais(remainingCents)),
      amountClassName: 'text-amber-600',
      onClick: () => input.onOpenTransaction(split.transactionId),
      sortDate: split.transactionDate,
    }

    const existing = groups.get(key)
    if (existing) {
      existing.totalRemainingCents += remainingCents
      if (isDue) {
        existing.dueRemainingCents += remainingCents
        existing.dueChildren.push(child)
      } else {
        existing.futureChildren.push(child)
      }
    } else {
      groups.set(key, {
        label: pendingSplitPersonLabel(split),
        dueRemainingCents: isDue ? remainingCents : 0,
        totalRemainingCents: remainingCents,
        dueChildren: isDue ? [child] : [],
        futureChildren: isDue ? [] : [child],
      })
    }
  }

  const items: KpiSummaryItem[] = []
  const secondaryItems: KpiSummaryItem[] = []

  for (const [key, group] of groups) {
    if (group.dueChildren.length > 0) {
      items.push(toPersonItem(key, group, 'due'))
    } else {
      secondaryItems.push(toPersonItem(key, group, 'future'))
    }
  }

  items.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  secondaryItems.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))

  return { items, secondaryItems }
}
