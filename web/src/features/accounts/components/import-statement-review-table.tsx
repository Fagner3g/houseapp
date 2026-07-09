import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ListViewModeToggle, type ListViewMode } from '@/components/list-view-mode-toggle'
import { QuickFilterBadges, resolveQuickFilterValue } from '@/components/quick-filter-badges'

import { aggregateImportReviewMerchants } from '../lib/aggregate-import-review-merchants'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'

import { CategorySelect } from './import-review-fields'
import { ImportStatementReviewGroups } from './import-statement-review-groups'
import {
  ImportStatementReviewRow,
  ImportStatementReviewTableHeader,
  isImportReviewItem,
} from './import-statement-review-row'
import {
  buildInitialReviewRows,
  hasMultipleInstallments,
  type ImportReviewRowState,
  type ParsedTransactionReviewItem,
} from './import-review-types'

type QuickFilter =
  | 'all'
  | 'new'
  | 'existing'
  | 'uncategorized'
  | 'divided'
  | 'installments'
  | 'unapproved'

const QUICK_FILTERS: Array<{
  id: QuickFilter
  label: string
  count?: (counts: FilterCounts) => number
}> = [
  { id: 'all', label: 'Todos' },
  { id: 'new', label: 'Para revisar', count: c => c.forReview },
  { id: 'existing', label: 'Já no sistema', count: c => c.existing },
  { id: 'uncategorized', label: 'Sem categoria', count: c => c.uncategorized },
  { id: 'divided', label: 'Compras divididas', count: c => c.divided },
  { id: 'installments', label: 'Parceladas', count: c => c.installments },
  { id: 'unapproved', label: 'Não aprovados', count: c => c.unapproved },
]

type FilterCounts = {
  forReview: number
  existing: number
  uncategorized: number
  divided: number
  installments: number
  unapproved: number
}

type ImportStatementReviewTableProps = {
  items: ParsedTransactionReviewItem[]
  rows: Record<string, ImportReviewRowState>
  onRowsChange: (rows: Record<string, ImportReviewRowState>) => void
}

export function ImportStatementReviewTable({
  items,
  rows,
  onRowsChange,
}: ImportStatementReviewTableProps) {
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [viewMode, setViewMode] = useState<ListViewMode>('grouped')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())

  const initializedRows = useMemo(() => {
    const next = { ...rows }
    for (const item of items) {
      if (!next[item.id]) {
        Object.assign(next, buildInitialReviewRows([item]))
      }
    }
    return next
  }, [rows, items])

  const reviewItems = useMemo(() => items.filter(isImportReviewItem), [items])
  const existingItems = useMemo(() => items.filter(item => item.isDuplicate), [items])
  const approvedCount = useMemo(
    () => reviewItems.filter(item => initializedRows[item.id]?.validated).length,
    [reviewItems, initializedRows]
  )

  const filterCounts = useMemo((): FilterCounts => {
    const categorizedCount = reviewItems.filter(item => {
      const row = initializedRows[item.id]
      return !!row?.categoryId && !isCardStatementCreditTitle(item.title)
    }).length
    const dividedCount = reviewItems.filter(
      item => initializedRows[item.id]?.splitMode !== 'none'
    ).length
    const installmentCount = items.filter(hasMultipleInstallments).length

    return {
      forReview: reviewItems.length,
      existing: existingItems.length,
      uncategorized: reviewItems.length - categorizedCount,
      divided: dividedCount,
      installments: installmentCount,
      unapproved: reviewItems.length - approvedCount,
    }
  }, [reviewItems, existingItems, initializedRows, items, approvedCount])

  const quickFilterOptions = useMemo(
    () =>
      QUICK_FILTERS.map(filter => ({
        id: filter.id,
        label: filter.label,
        count: filter.count?.(filterCounts),
      })),
    [filterCounts]
  )
  const activeQuickFilter = resolveQuickFilterValue(quickFilter, quickFilterOptions)

  const visibleItems = items.filter(item => {
    const row = initializedRows[item.id]
    const needsReview = isImportReviewItem(item)

    if (activeQuickFilter === 'new' && !needsReview) return false
    if (activeQuickFilter === 'existing' && needsReview) return false
    if (activeQuickFilter === 'uncategorized' && (!needsReview || row?.categoryId)) return false
    if (activeQuickFilter === 'divided' && (!needsReview || row?.splitMode === 'none')) return false
    if (activeQuickFilter === 'installments' && !hasMultipleInstallments(item)) return false
    if (activeQuickFilter === 'unapproved' && (!needsReview || row?.validated)) return false
    return true
  })

  const { merchants: merchantGroups } = useMemo(
    () => aggregateImportReviewMerchants(visibleItems, initializedRows),
    [visibleItems, initializedRows]
  )

  const selectableVisibleItems = visibleItems.filter(isImportReviewItem)

  const updateRow = (id: string, patch: Partial<ImportReviewRowState>) => {
    const fallbackRows = buildInitialReviewRows([{ id, amount: '0' }])
    const baseRow = initializedRows[id] ?? fallbackRows[id]
    if (!baseRow) return

    onRowsChange({
      ...initializedRows,
      [id]: {
        ...baseRow,
        ...patch,
      },
    })
  }

  const updateRows = (patches: Record<string, Partial<ImportReviewRowState>>) => {
    const next = { ...initializedRows }
    for (const [id, patch] of Object.entries(patches)) {
      const current = next[id]
      if (!current) continue
      next[id] = { ...current, ...patch }
    }
    onRowsChange(next)
  }

  const applyBulkCategory = () => {
    if (!bulkCategoryId) {
      toast.error('Selecione uma categoria')
      return
    }

    const targetIds = (selectedIds.size
      ? [...selectedIds].filter(id => reviewItems.some(item => item.id === id))
      : reviewItems.map(item => item.id)
    ).filter(id => {
      const item = reviewItems.find(entry => entry.id === id)
      return item ? !isCardStatementCreditTitle(item.title) : false
    })

    if (targetIds.length === 0) {
      toast.error('Nenhum lançamento novo selecionado')
      return
    }

    const patches = Object.fromEntries(
      targetIds.map(id => [id, { categoryId: bulkCategoryId } satisfies Partial<ImportReviewRowState>])
    )
    updateRows(patches)
    toast.success('Categoria aplicada')
  }

  const markApproved = (ids: string[]) => {
    const patches = Object.fromEntries(
      ids.map(id => [id, { validated: true } satisfies Partial<ImportReviewRowState>])
    )
    updateRows(patches)
  }

  const approveSelected = () => {
    const ids = [...selectedIds].filter(id => reviewItems.some(item => item.id === id))
    if (ids.length === 0) return
    markApproved(ids)
    toast.success(`${ids.length} lançamento(s) aprovado(s)`)
  }

  const approveVisible = () => {
    const ids = selectableVisibleItems.map(item => item.id)
    markApproved(ids)
    toast.success(`${ids.length} lançamento(s) aprovado(s)`)
  }

  const approveAll = () => {
    markApproved(reviewItems.map(item => item.id))
    toast.success(`${reviewItems.length} lançamentos aprovados`)
  }

  const toggleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }

  const toggleSelectGroup = (
    reviewItemIds: string[],
    checked: boolean
  ) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of reviewItemIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const applyGroupCategory = (reviewItemIds: string[], categoryId: string | null) => {
    const patches = Object.fromEntries(
      reviewItemIds.map(id => [id, { categoryId } satisfies Partial<ImportReviewRowState>])
    )
    updateRows(patches)
  }

  const toggleGroupExpand = (key: string) => {
    setExpandedGroupKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {existingItems.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-1 text-xs text-slate-600">
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            {existingItems.length} já no sistema
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
            {reviewItems.length} para revisar
          </Badge>
          <span className="text-slate-500">
            Lançamentos já importados aparecem somente leitura; novos precisam de aprovação.
          </span>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <QuickFilterBadges
          value={quickFilter}
          options={quickFilterOptions}
          onChange={setQuickFilter}
        />

        <ListViewModeToggle
          className="ml-auto shrink-0"
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      {viewMode === 'grouped' ? (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-600">
            Defina a categoria em cada estabelecimento. Expanda para dividir compras individuais.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <CategorySelect
                  value={bulkCategoryId || null}
                  type="expense"
                  className="h-8 w-36"
                  onChange={id => setBulkCategoryId(id ?? '')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!bulkCategoryId}
                  onClick={applyBulkCategory}
                >
                  Aplicar em {selectedIds.size}
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={reviewItems.length === 0 || approvedCount === reviewItems.length}
              onClick={approveAll}
            >
              <Check className="mr-1.5 size-3.5" />
              Aprovar todos ({reviewItems.length - approvedCount})
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label className="text-xs text-slate-600">Aplicar categoria</Label>
            <CategorySelect
              value={bulkCategoryId || null}
              type="expense"
              onChange={id => setBulkCategoryId(id ?? '')}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reviewItems.length === 0}
            onClick={applyBulkCategory}
          >
            {selectedIds.size
              ? `Aplicar em ${selectedIds.size} selecionados`
              : 'Aplicar nos novos'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={approveSelected}
          >
            <Check className="mr-1.5 size-3.5" />
            {selectedIds.size ? `Aprovar selecionados (${selectedIds.size})` : 'Aprovar selecionados'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={quickFilter === 'all' || selectableVisibleItems.length === 0}
            onClick={approveVisible}
          >
            <Check className="mr-1.5 size-3.5" />
            {quickFilter !== 'all'
              ? `Aprovar visíveis (${selectableVisibleItems.length})`
              : 'Aprovar visíveis'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reviewItems.length === 0}
            onClick={approveAll}
          >
            <Check className="mr-1.5 size-3.5" />
            Aprovar todos os novos
          </Button>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
        <div className="h-full overflow-y-auto overscroll-contain">
          {viewMode === 'grouped' ? (
            <ImportStatementReviewGroups
              groups={merchantGroups}
              items={visibleItems}
              rows={initializedRows}
              expandedGroupKeys={expandedGroupKeys}
              selectedIds={selectedIds}
              onToggleExpand={toggleGroupExpand}
              onToggleSelectGroup={(group, checked) =>
                toggleSelectGroup(group.reviewItemIds, checked)
              }
              onApplyGroupCategory={(group, categoryId) =>
                applyGroupCategory(group.reviewItemIds, categoryId)
              }
              onApproveGroup={group => {
                markApproved(group.reviewItemIds)
                toast.success(`${group.reviewCount} lançamento(s) aprovado(s)`)
              }}
              onUpdateRow={updateRow}
            />
          ) : visibleItems.length === 0 ? (
            <div className="flex h-32 items-center justify-center px-4 text-sm text-slate-500">
              Nenhum lançamento corresponde a este filtro.
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-left">
              <ImportStatementReviewTableHeader
                selectableCount={selectableVisibleItems.length}
                allSelected={
                  selectableVisibleItems.length > 0 &&
                  selectableVisibleItems.every(item => selectedIds.has(item.id))
                }
                onSelectAll={checked =>
                  setSelectedIds(
                    checked
                      ? new Set(selectableVisibleItems.map(item => item.id))
                      : new Set()
                  )
                }
              />
              <tbody>
                {visibleItems.map(item => {
                  const row = initializedRows[item.id]
                  if (!row) return null

                  return (
                    <ImportStatementReviewRow
                      key={item.id}
                      item={item}
                      row={row}
                      selected={selectedIds.has(item.id)}
                      onSelectChange={checked => toggleSelectItem(item.id, checked === true)}
                      onUpdateRow={patch => updateRow(item.id, patch)}
                    />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
