import { CategorySelect as CategorySelectBase } from '@/features/categories/components/category-select'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'

import type { SplitMode } from './import-review-types'

export { MemberSelect } from './member-select'

export const SPLIT_MODE_LABELS: Record<SplitMode, string> = {
  none: 'Minha despesa',
  half: 'Dividir 50%',
  custom: 'Valor customizado',
  full_other: 'Delegar conta',
}

export function CategorySelect({
  value,
  type,
  onChange,
  className,
  disabled,
  clearable = true,
}: {
  value: string | null
  type: 'income' | 'expense'
  onChange: (categoryId: string | null) => void
  className?: string
  disabled?: boolean
  clearable?: boolean
}) {
  return (
    <CategorySelectBase
      value={value ?? undefined}
      type={type}
      onChange={id => onChange(id || null)}
      className={className ?? 'h-8 min-w-[140px]'}
      placeholder="Categoria"
      enabled={!disabled}
      clearable={clearable}
    />
  )
}

export function ImportReviewCategoryField({
  title,
  value,
  type,
  onChange,
  className,
}: {
  title: string
  value: string | null
  type: 'income' | 'expense'
  onChange: (categoryId: string | null) => void
  className?: string
}) {
  if (isCardStatementCreditTitle(title)) {
    return (
      <span
        className="inline-flex h-8 min-w-[140px] items-center rounded-md border border-dashed border-slate-200 px-3 text-xs text-slate-500"
        title="Liquidação ou crédito na fatura — não precisa de categoria"
      >
        Sem categoria
      </span>
    )
  }

  return (
    <CategorySelect
      value={value}
      type={type}
      className={className}
      onChange={onChange}
    />
  )
}
