import dayjs from 'dayjs'
import { CheckCircle2, Split } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
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

import { ImportReviewCategoryField, MemberSelect, SPLIT_MODE_LABELS } from './import-review-fields'
import { ImportReviewSignedAmount } from './import-review-signed-amount'
import {
  resolveSplitAmountReais,
  type ImportReviewRowState,
  type ParsedTransactionReviewItem,
  type SplitMode,
} from './import-review-types'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'

export function isImportReviewItem(item: ParsedTransactionReviewItem) {
  return !item.isDuplicate
}

export function getImportReviewRowClass(
  item: ParsedTransactionReviewItem,
  row: ImportReviewRowState
) {
  const needsReview = isImportReviewItem(item)
  const exemptFromCategory = isCardStatementCreditTitle(item.title)
  const hasCategory = !!row.categoryId && !exemptFromCategory
  const hasSplit = row.splitMode !== 'none'

  if (!needsReview) return 'bg-slate-50/80 text-slate-500'
  if (exemptFromCategory) {
    return row.validated ? 'bg-emerald-50/60' : undefined
  }
  if (row.validated) return 'bg-emerald-50/60'
  if (hasSplit) return 'bg-violet-50/50'
  if (!hasCategory) return 'bg-amber-50/40'
  return undefined
}

type ImportStatementReviewRowProps = {
  item: ParsedTransactionReviewItem
  row: ImportReviewRowState
  selected: boolean
  onSelectChange: (checked: boolean) => void
  onUpdateRow: (patch: Partial<ImportReviewRowState>) => void
}

export function ImportStatementReviewRow({
  item,
  row,
  selected,
  onSelectChange,
  onUpdateRow,
}: ImportStatementReviewRowProps) {
  const needsReview = isImportReviewItem(item)
  const rowClass = getImportReviewRowClass(item, row)

  return (
    <tr className={cn('border-t border-slate-100 align-top', rowClass)}>
      <td className="px-2 py-2">
        {needsReview ? (
          <Checkbox checked={selected} onCheckedChange={onSelectChange} />
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
            onClick={() => onUpdateRow({ validated: !row.validated })}
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
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
              Aprovado
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
              Revisar
            </Badge>
          )
        ) : (
          <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600">
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
      <td className="px-3 py-2 text-sm text-slate-600">{dayjs(item.date).format('DD/MM/YY')}</td>
      <td className="px-3 py-2 text-right text-sm">
        <ImportReviewSignedAmount amount={item.amount} type={item.type} />
      </td>
      <td className="px-3 py-2">
        {needsReview ? (
          <ImportReviewCategoryField
            title={item.title}
            value={row.categoryId}
            type={item.type}
            className="h-8 w-full min-w-0"
            onChange={categoryId => onUpdateRow({ categoryId })}
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
              onUpdateRow({
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
                onUpdateRow({ splitPersonMode: mode as 'member' | 'contact' })
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
                onChange={userId => onUpdateRow({ splitUserId: userId })}
              />
            ) : (
              <div className="flex gap-1.5">
                <Input
                  className="h-8"
                  placeholder="Nome"
                  value={row.splitContactName}
                  onChange={e => onUpdateRow({ splitContactName: e.target.value })}
                />
                <PhoneInput
                  className="h-8 w-28"
                  placeholder="Tel."
                  value={row.splitContactPhone}
                  onValueChange={splitContactPhone => onUpdateRow({ splitContactPhone })}
                />
              </div>
            )}

            {row.splitMode === 'custom' ? (
              <CurrencyInput
                value={row.splitAmountReais}
                onChange={value => onUpdateRow({ splitAmountReais: value })}
              />
            ) : (
              <p className="text-[11px] tabular-nums text-slate-500">
                {formatCentsString(
                  reaisToMoneyString(
                    resolveSplitAmountReais(item.amount, row.splitMode, row.splitAmountReais)
                  )
                )}
              </p>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

type ImportStatementReviewCompactRowProps = {
  item: ParsedTransactionReviewItem
  row: ImportReviewRowState
  hideCategory?: boolean
  onUpdateRow: (patch: Partial<ImportReviewRowState>) => void
}

export function ImportStatementReviewCompactRow({
  item,
  row,
  hideCategory = false,
  onUpdateRow,
}: ImportStatementReviewCompactRowProps) {
  const [showSplit, setShowSplit] = useState(row.splitMode !== 'none')
  const needsReview = isImportReviewItem(item)
  const hasSplit = row.splitMode !== 'none'

  if (!needsReview) {
    return (
      <div className="flex items-center gap-3 border-t border-slate-100/80 px-3 py-2 text-slate-500 first:border-t-0">
        <CheckCircle2 className="size-4 shrink-0 text-slate-300" />
        <span className="w-14 shrink-0 text-xs tabular-nums">{dayjs(item.date).format('DD/MM/YY')}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{item.title}</p>
          {item.duplicateTransactionTitle ? (
            <p className="truncate text-xs text-slate-400">
              Vinculado a &quot;{item.duplicateTransactionTitle}&quot;
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs">Já no sistema</span>
        <span className="w-24 shrink-0 text-right text-sm">
          <ImportReviewSignedAmount amount={item.amount} type={item.type} muted />
        </span>
      </div>
    )
  }

  return (
    <div className={cn('border-t border-slate-100/80 first:border-t-0', getImportReviewRowClass(item, row))}>
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          className="shrink-0 rounded-md p-0.5 hover:bg-white/60"
          title={row.validated ? 'Desfazer aprovação' : 'Aprovar lançamento'}
          onClick={() => onUpdateRow({ validated: !row.validated })}
        >
          <CheckCircle2
            className={
              row.validated
                ? 'size-4 text-emerald-600'
                : 'size-4 text-slate-300 hover:text-slate-500'
            }
          />
        </button>

        <span className="w-14 shrink-0 text-xs tabular-nums text-slate-600">
          {dayjs(item.date).format('DD/MM/YY')}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
          {item.installmentLabel ? (
            <p className="text-xs text-slate-500">Parcela {item.installmentLabel}</p>
          ) : null}
        </div>

        {!hideCategory ? (
          <div className="hidden w-36 shrink-0 md:block">
            <ImportReviewCategoryField
              title={item.title}
              value={row.categoryId}
              type={item.type}
              className="h-8 w-full min-w-0"
              onChange={categoryId => onUpdateRow({ categoryId })}
            />
          </div>
        ) : null}

        <button
          type="button"
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
            hasSplit
              ? 'border-violet-200 bg-violet-50 text-violet-700'
              : 'border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-600'
          )}
          title={hasSplit ? 'Editar divisão' : 'Dividir compra'}
          onClick={() => setShowSplit(value => !value)}
        >
          <Split className="size-3.5" />
        </button>

        <span className="w-24 shrink-0 text-right text-sm">
          <ImportReviewSignedAmount amount={item.amount} type={item.type} />
        </span>
      </div>

      {!hideCategory ? (
        <div className="px-3 pb-2 md:hidden">
          <ImportReviewCategoryField
            title={item.title}
            value={row.categoryId}
            type={item.type}
            className="h-8 w-full min-w-0"
            onChange={categoryId => onUpdateRow({ categoryId })}
          />
        </div>
      ) : null}

      {showSplit ? (
        <div className="grid gap-2 border-t border-slate-100/80 bg-white/70 px-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            value={row.splitMode}
            onValueChange={mode => {
              const splitMode = mode as SplitMode
              onUpdateRow({
                splitMode,
                splitAmountReais:
                  splitMode === 'half'
                    ? moneyStringToReais(item.amount) / 2
                    : splitMode === 'full_other'
                      ? moneyStringToReais(item.amount)
                      : row.splitAmountReais,
              })
              if (splitMode !== 'none') setShowSplit(true)
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

          {row.splitMode !== 'none' ? (
            <>
              <Select
                value={row.splitPersonMode}
                onValueChange={mode =>
                  onUpdateRow({ splitPersonMode: mode as 'member' | 'contact' })
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
                  onChange={userId => onUpdateRow({ splitUserId: userId })}
                />
              ) : (
                <div className="flex gap-1.5 sm:col-span-2">
                  <Input
                    className="h-8"
                    placeholder="Nome"
                    value={row.splitContactName}
                    onChange={e => onUpdateRow({ splitContactName: e.target.value })}
                  />
                  <PhoneInput
                    className="h-8 w-28"
                    placeholder="Tel."
                    value={row.splitContactPhone}
                    onValueChange={splitContactPhone => onUpdateRow({ splitContactPhone })}
                  />
                </div>
              )}

              {row.splitMode === 'custom' ? (
                <CurrencyInput
                  value={row.splitAmountReais}
                  onChange={value => onUpdateRow({ splitAmountReais: value })}
                />
              ) : (
                <p className="flex items-center text-[11px] tabular-nums text-slate-500">
                  Valor dividido:{' '}
                  {formatCentsString(
                    reaisToMoneyString(
                      resolveSplitAmountReais(item.amount, row.splitMode, row.splitAmountReais)
                    )
                  )}
                </p>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ImportStatementReviewTableHeader({
  selectableCount,
  allSelected,
  onSelectAll,
}: {
  selectableCount: number
  allSelected: boolean
  onSelectAll: (checked: boolean) => void
}) {
  return (
    <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)] text-[11px] uppercase tracking-wide text-slate-500">
      <tr>
        <th className="w-10 px-2 py-2">
          <Checkbox
            checked={selectableCount > 0 && allSelected}
            disabled={selectableCount === 0}
            onCheckedChange={onSelectAll}
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
  )
}
