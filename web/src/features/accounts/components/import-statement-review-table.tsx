import dayjs from 'dayjs'
import { Check, CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCentsString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { CategorySelect, MemberSelect, SPLIT_MODE_LABELS } from './import-review-fields'
import {
  buildInitialReviewRows,
  hasMultipleInstallments,
  resolveSplitAmountReais,
  type ImportReviewRowState,
  type ParsedTransactionReviewItem,
  type SplitMode,
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

function isReviewItem(item: ParsedTransactionReviewItem) {
  return !item.isDuplicate
}

export function ImportStatementReviewTable({
  items,
  rows,
  onRowsChange,
}: ImportStatementReviewTableProps) {
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const initializedRows = useMemo(() => {
    const next = { ...rows }
    for (const item of items) {
      if (!next[item.id]) {
        Object.assign(next, buildInitialReviewRows([item]))
      }
    }
    return next
  }, [rows, items])

  const reviewItems = items.filter(isReviewItem)
  const existingItems = items.filter(item => item.isDuplicate)

  const visibleItems = items.filter(item => {
    const row = initializedRows[item.id]
    const needsReview = isReviewItem(item)

    if (quickFilter === 'new' && !needsReview) return false
    if (quickFilter === 'existing' && needsReview) return false
    if (quickFilter === 'uncategorized' && (!needsReview || row?.categoryId)) return false
    if (quickFilter === 'divided' && (!needsReview || row?.splitMode === 'none')) return false
    if (quickFilter === 'installments' && !hasMultipleInstallments(item)) return false
    if (quickFilter === 'unapproved' && (!needsReview || row?.validated)) return false
    return true
  })

  const approvedCount = reviewItems.filter(item => initializedRows[item.id]?.validated).length
  const categorizedCount = reviewItems.filter(item => initializedRows[item.id]?.categoryId).length
  const dividedCount = reviewItems.filter(item => initializedRows[item.id]?.splitMode !== 'none').length
  const installmentCount = items.filter(hasMultipleInstallments).length
  const filterCounts: FilterCounts = {
    forReview: reviewItems.length,
    existing: existingItems.length,
    uncategorized: reviewItems.length - categorizedCount,
    divided: dividedCount,
    installments: installmentCount,
    unapproved: reviewItems.length - approvedCount,
  }

  const selectableVisibleItems = visibleItems.filter(isReviewItem)

  const updateRow = (id: string, patch: Partial<ImportReviewRowState>) => {
    onRowsChange({
      ...initializedRows,
      [id]: {
        ...(initializedRows[id] ?? buildInitialReviewRows([{ id, amount: '0' }])[id]!),
        ...patch,
      },
    })
  }

  const applyBulkCategory = () => {
    if (!bulkCategoryId) {
      toast.error('Selecione uma categoria')
      return
    }

    const targetIds = selectedIds.size
      ? [...selectedIds].filter(id => reviewItems.some(item => item.id === id))
      : reviewItems.map(item => item.id)

    if (targetIds.length === 0) {
      toast.error('Nenhum lançamento novo selecionado')
      return
    }

    const next = { ...initializedRows }
    for (const id of targetIds) {
      const current = next[id]
      if (!current) continue
      next[id] = { ...current, categoryId: bulkCategoryId }
    }
    onRowsChange(next)
    toast.success('Categoria aplicada')
  }

  const markApproved = (ids: string[]) => {
    const next = { ...initializedRows }
    for (const id of ids) {
      const current = next[id]
      if (!current) continue
      next[id] = { ...current, validated: true }
    }
    onRowsChange(next)
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
        {QUICK_FILTERS.map(filter => {
          const count = filter.count?.(filterCounts)
          const isActive = quickFilter === filter.id
          const isDisabled =
            filter.id !== 'all' &&
            filter.id !== 'new' &&
            filter.id !== 'existing' &&
            count === 0

          return (
            <button
              key={filter.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setQuickFilter(filter.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                isDisabled && 'cursor-not-allowed opacity-40 hover:border-slate-200 hover:bg-white'
              )}
            >
              {filter.label}
              {count != null && filter.id !== 'all' ? (
                <span className={cn('tabular-nums', isActive ? 'text-white/80' : 'text-slate-400')}>
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

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

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
        <div className="h-full overflow-y-auto overscroll-contain">
          {visibleItems.length === 0 ? (
            <div className="flex h-32 items-center justify-center px-4 text-sm text-slate-500">
              Nenhum lançamento corresponde a este filtro.
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)] text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-2 py-2">
                    <Checkbox
                      checked={
                        selectableVisibleItems.length > 0 &&
                        selectableVisibleItems.every(item => selectedIds.has(item.id))
                      }
                      disabled={selectableVisibleItems.length === 0}
                      onCheckedChange={checked =>
                        setSelectedIds(
                          checked
                            ? new Set(selectableVisibleItems.map(item => item.id))
                            : new Set()
                        )
                      }
                    />
                  </th>
                  <th className="w-10 px-2 py-2 text-center">OK</th>
                  <th className="w-36 px-3 py-2">Status</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="w-28 px-3 py-2">Data</th>
                  <th className="w-28 px-3 py-2 text-right">Valor</th>
                  <th className="w-44 px-3 py-2">Categoria</th>
                  <th className="w-40 px-3 py-2">Delegação</th>
                  <th className="min-w-[180px] px-3 py-2">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map(item => {
                  const row = initializedRows[item.id]
                  if (!row) return null

                  const needsReview = isReviewItem(item)
                  const hasCategory = !!row.categoryId
                  const hasSplit = row.splitMode !== 'none'
                  const rowClass = !needsReview
                    ? 'bg-slate-50/80 text-slate-500'
                    : row.validated
                      ? 'bg-emerald-50/60'
                      : hasSplit
                        ? 'bg-violet-50/50'
                        : !hasCategory
                          ? 'bg-amber-50/40'
                          : undefined

                  return (
                    <tr
                      key={item.id}
                      className={cn('border-t border-slate-100 align-top', rowClass)}
                    >
                      <td className="px-2 py-2">
                        {needsReview ? (
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={checked => {
                              setSelectedIds(prev => {
                                const next = new Set(prev)
                                if (checked) next.add(item.id)
                                else next.delete(item.id)
                                return next
                              })
                            }}
                          />
                        ) : (
                          <span className="inline-block size-4" />
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {needsReview ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md p-1 hover:bg-slate-100"
                            title={row.validated ? 'Desfazer aprovação' : 'Aprovar lançamento'}
                            onClick={() => updateRow(item.id, { validated: !row.validated })}
                          >
                            <CheckCircle2
                              className={
                                row.validated
                                  ? 'size-4 text-emerald-600'
                                  : 'size-4 text-slate-300 hover:text-slate-400'
                              }
                            />
                          </button>
                        ) : (
                          <CheckCircle2 className="mx-auto size-4 text-slate-300" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {needsReview ? (
                          row.validated ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-800"
                            >
                              Aprovado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-amber-800"
                            >
                              Revisar
                            </Badge>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-100 text-slate-600"
                          >
                            Já no sistema
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            needsReview ? 'text-slate-900' : 'text-slate-600'
                          )}
                        >
                          {item.title}
                        </p>
                        {item.installmentLabel ? (
                          <p className="text-xs text-slate-500">Parcela {item.installmentLabel}</p>
                        ) : null}
                        {!needsReview && item.duplicateTransactionTitle ? (
                          <p className="text-xs text-slate-400">
                            Vinculado a &quot;{item.duplicateTransactionTitle}&quot;
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {dayjs(item.date).format('DD/MM/YY')}
                      </td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums text-slate-800">
                        {formatCentsString(item.amount)}
                      </td>
                      <td className="px-3 py-2">
                        {needsReview ? (
                          <CategorySelect
                            value={row.categoryId}
                            type={item.type}
                            className="h-8 w-full min-w-0"
                            onChange={categoryId => updateRow(item.id, { categoryId })}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {needsReview ? (
                          <Select
                            value={row.splitMode}
                            onValueChange={mode => {
                              const splitMode = mode as SplitMode
                              updateRow(item.id, {
                                splitMode,
                                splitAmountReais:
                                  splitMode === 'half'
                                    ? moneyStringToReais(item.amount) / 2
                                    : splitMode === 'full_other'
                                      ? moneyStringToReais(item.amount)
                                      : row.splitAmountReais,
                              })
                            }}
                          >
                            <SelectTrigger className="h-8 w-full min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SPLIT_MODE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!needsReview || row.splitMode === 'none' ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="space-y-1.5">
                            <Select
                              value={row.splitPersonMode}
                              onValueChange={mode =>
                                updateRow(item.id, {
                                  splitPersonMode: mode as 'member' | 'contact',
                                })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Membro</SelectItem>
                                <SelectItem value="contact">Contato</SelectItem>
                              </SelectContent>
                            </Select>

                            {row.splitPersonMode === 'member' ? (
                              <MemberSelect
                                value={row.splitUserId}
                                className="h-8 w-full min-w-0"
                                onChange={userId => updateRow(item.id, { splitUserId: userId })}
                              />
                            ) : (
                              <div className="flex gap-1.5">
                                <Input
                                  className="h-8"
                                  placeholder="Nome"
                                  value={row.splitContactName}
                                  onChange={e =>
                                    updateRow(item.id, { splitContactName: e.target.value })
                                  }
                                />
                                <PhoneInput
                                  className="h-8 w-28"
                                  placeholder="Tel."
                                  value={row.splitContactPhone}
                                  onValueChange={splitContactPhone =>
                                    updateRow(item.id, { splitContactPhone })
                                  }
                                />
                              </div>
                            )}

                            {row.splitMode === 'custom' ? (
                              <CurrencyInput
                                value={row.splitAmountReais}
                                onChange={value => updateRow(item.id, { splitAmountReais: value })}
                              />
                            ) : (
                              <p className="text-[11px] tabular-nums text-slate-500">
                                {formatCentsString(
                                  reaisToMoneyString(
                                    resolveSplitAmountReais(
                                      item.amount,
                                      row.splitMode,
                                      row.splitAmountReais
                                    )
                                  )
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
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
