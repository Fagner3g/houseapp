import type { CSSProperties } from 'react'

import type { ListCategories200CategoriesItem } from '@/api/generated/model'

export type CategoryType = 'income' | 'expense'

export const CATEGORY_GROUPS: {
  type: CategoryType
  title: string
  dotClass: string
  iconBgClass: string
  iconClass: string
}[] = [
  {
    type: 'income',
    title: 'Entradas / Receitas',
    dotClass: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50',
    iconClass: 'text-emerald-600',
  },
  {
    type: 'expense',
    title: 'Saídas / Despesas',
    dotClass: 'bg-rose-500',
    iconBgClass: 'bg-rose-50',
    iconClass: 'text-rose-600',
  },
]

export function groupCategoriesByType(categories: ListCategories200CategoriesItem[]) {
  return {
    income: categories.filter(category => category.type === 'income'),
    expense: categories.filter(category => (category.type ?? 'expense') === 'expense'),
  }
}

export function categoryDotStyle(category: ListCategories200CategoriesItem): CSSProperties | undefined {
  if (!category.color) return undefined
  return { backgroundColor: category.color }
}
