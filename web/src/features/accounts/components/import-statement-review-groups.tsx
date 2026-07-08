import dayjs from 'dayjs'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

import {
  formatImportReviewMerchantSubtitle,
  type ImportReviewMerchantGroup,
} from '../lib/aggregate-import-review-merchants'
import { getImportReviewGroupSignedAmount } from '../lib/import-review-amount'

import { CategorySelect } from './import-review-fields'
import { ImportStatementReviewCompactRow } from './import-statement-review-row'
import type { ImportReviewRowState, ParsedTransactionReviewItem } from './import-review-types'

function resolveGroupCategoryId(
  group: ImportReviewMerchantGroup,
  rows: Record<string, ImportReviewRowState>
): string | null {
  const ids = group.reviewItemIds
  if (ids.length === 0) return null

  const firstId = ids[0]
  if (firstId == null) return null

  const first = rows[firstId]?.categoryId ?? null
  const allSame = ids.every(id => (rows[id]?.categoryId ?? null) === first)
  return allSame ? first : null
}

function groupStatusLabel(group: ImportReviewMerchantGroup): string | null {
  if (group.reviewCount === 0) return null
  if (group.approvedCount === group.reviewCount) return 'Aprovado'
  if (group.uncategorizedCount > 0) return `${group.uncategorizedCount} sem categoria`
  return `${group.approvedCount}/${group.reviewCount} aprovados`
}

type ImportStatementReviewMerchantGroupProps = {
  group: ImportReviewMerchantGroup
  items: ParsedTransactionReviewItem[]
  rows: Record<string, ImportReviewRowState>
  expanded: boolean
  selectedIds: Set<string>
  onToggleExpand: () => void
  onToggleSelectGroup: (checked: boolean) => void
  onApplyGroupCategory: (categoryId: string | null) => void
  onApproveGroup: () => void
  onUpdateRow: (id: string, patch: Partial<ImportReviewRowState>) => void
}

export function ImportStatementReviewMerchantGroup({
  group,
  items,
  rows,
  expanded,
  selectedIds,
  onToggleExpand,
  onToggleSelectGroup,
  onApplyGroupCategory,
  onApproveGroup,
  onUpdateRow,
}: ImportStatementReviewMerchantGroupProps) {
  const groupItems = items.filter(item => group.itemIds.includes(item.id))
  const signedTotal = getImportReviewGroupSignedAmount(groupItems, group)
  const allReviewSelected =
    group.reviewItemIds.length > 0 &&
    group.reviewItemIds.every(id => selectedIds.has(id))
  const someReviewSelected =
    group.reviewItemIds.some(id => selectedIds.has(id)) && !allReviewSelected
  const hasEditableReview = group.reviewCount > 0
  const allApproved = hasEditableReview && group.approvedCount === group.reviewCount
  const groupCategoryId = resolveGroupCategoryId(group, rows)
  const statusLabel = groupStatusLabel(group)

  const subtitle =
    group.existingCount > 0 && group.reviewCount > 0
      ? formatImportReviewMerchantSubtitle(group)
      : group.occurrenceCount === 1
        ? `1 compra · ${dayjs(group.lastDate).format('DD/MM/YY')}`
        : `${group.occurrenceCount} compras · última ${dayjs(group.lastDate).format('DD/MM/YY')}`

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border transition-colors',
        expanded ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {hasEditableReview ? (
          <Checkbox
            checked={allReviewSelected ? true : someReviewSelected ? 'indeterminate' : false}
            onCheckedChange={checked => onToggleSelectGroup(checked === true)}
          />
        ) : (
          <span className="inline-block size-4 shrink-0" />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium text-slate-900">{group.label}</span>
              {group.uniformType === 'income' ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700"
                >
                  Receita
                </Badge>
              ) : null}
              {group.isRecurring ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-violet-200 bg-violet-50 px-1.5 text-[10px] font-medium text-violet-700"
                >
                  Recorrente
                </Badge>
              ) : null}
              {group.hasInstallments ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-600"
                >
                  Parcelada
                </Badge>
              ) : null}
              {statusLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 shrink-0 px-1.5 text-[10px] font-medium',
                    allApproved
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : group.uncategorizedCount > 0
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  {statusLabel}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
        </button>

        {hasEditableReview && group.uniformType ? (
          <div className="hidden w-40 shrink-0 sm:block">
            <CategorySelect
              value={groupCategoryId}
              type={group.uniformType}
              className="h-8 w-full min-w-0"
              onChange={onApplyGroupCategory}
            />
          </div>
        ) : null}

        {hasEditableReview ? (
          <Button
            type="button"
            variant={allApproved ? 'secondary' : 'outline'}
            size="icon"
            className={cn(
              'size-8 shrink-0',
              allApproved && 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            )}
            title={allApproved ? 'Grupo aprovado' : `Aprovar ${group.reviewCount} lançamento(s)`}
            onClick={onApproveGroup}
          >
            <Check className="size-4" />
          </Button>
        ) : null}

        <p
          className={cn(
            'w-24 shrink-0 text-right text-sm font-semibold tabular-nums',
            signedTotal.className
          )}
        >
          {signedTotal.label}
        </p>
      </div>

      {hasEditableReview && group.uniformType ? (
        <div className="border-t border-slate-100 px-3 py-2 sm:hidden">
          <CategorySelect
            value={groupCategoryId}
            type={group.uniformType}
            className="h-8 w-full min-w-0"
            onChange={onApplyGroupCategory}
          />
        </div>
      ) : null}

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60">
          {groupItems.map(item => {
            const row = rows[item.id]
            if (!row) return null

            return (
              <ImportStatementReviewCompactRow
                key={item.id}
                item={item}
                row={row}
                hideCategory={group.uniformType != null && group.reviewItemIds.includes(item.id)}
                onUpdateRow={patch => onUpdateRow(item.id, patch)}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

type ImportStatementReviewGroupsProps = {
  groups: ImportReviewMerchantGroup[]
  items: ParsedTransactionReviewItem[]
  rows: Record<string, ImportReviewRowState>
  expandedGroupKeys: Set<string>
  selectedIds: Set<string>
  onToggleExpand: (key: string) => void
  onToggleSelectGroup: (group: ImportReviewMerchantGroup, checked: boolean) => void
  onApplyGroupCategory: (group: ImportReviewMerchantGroup, categoryId: string | null) => void
  onApproveGroup: (group: ImportReviewMerchantGroup) => void
  onUpdateRow: (id: string, patch: Partial<ImportReviewRowState>) => void
}

export function ImportStatementReviewGroups({
  groups,
  items,
  rows,
  expandedGroupKeys,
  selectedIds,
  onToggleExpand,
  onToggleSelectGroup,
  onApplyGroupCategory,
  onApproveGroup,
  onUpdateRow,
}: ImportStatementReviewGroupsProps) {
  if (groups.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center px-4 text-sm text-slate-500">
        Nenhum estabelecimento corresponde a este filtro.
      </div>
    )
  }

  return (
    <div className="space-y-2 p-2">
      {groups.map(group => (
        <ImportStatementReviewMerchantGroup
          key={group.key}
          group={group}
          items={items}
          rows={rows}
          expanded={expandedGroupKeys.has(group.key)}
          selectedIds={selectedIds}
          onToggleExpand={() => onToggleExpand(group.key)}
          onToggleSelectGroup={checked => onToggleSelectGroup(group, checked)}
          onApplyGroupCategory={categoryId => onApplyGroupCategory(group, categoryId)}
          onApproveGroup={() => onApproveGroup(group)}
          onUpdateRow={onUpdateRow}
        />
      ))}
    </div>
  )
}
