import type { ListCategories200CategoriesItem } from '@/api/generated/model'
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import type { CategoryType } from '@/features/categories/constants'
import { categoryDotStyle } from '@/features/categories/constants'
import { cn } from '@/lib/utils'

interface CategoryGroupPanelProps {
  type: CategoryType
  title: string
  dotClass: string
  iconBgClass: string
  iconClass: string
  categories: ListCategories200CategoriesItem[]
  onEdit: (category: ListCategories200CategoriesItem) => void
  onDelete: (id: string, name: string) => void
}

export function CategoryGroupPanel({
  type,
  title,
  dotClass,
  iconBgClass,
  iconClass,
  categories,
  onEdit,
  onDelete,
}: CategoryGroupPanelProps) {
  const [open, setOpen] = useState(true)
  const Icon = type === 'income' ? ArrowUp : ArrowDown

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
        onClick={() => setOpen(current => !current)}
      >
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            iconBgClass
          )}
        >
          <Icon className={cn('size-4', iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">
            {title} ({categories.length})
          </p>
        </div>
        <ChevronDown
          className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {categories.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Nenhuma categoria cadastrada.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {categories.map(category => (
                <li
                  key={category.id}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg py-3 transition-colors hover:bg-slate-50"
                  onClick={() => onEdit(category)}
                >
                  <span
                    className={cn('size-2.5 shrink-0 rounded-full', !category.color && dotClass)}
                    style={categoryDotStyle(category)}
                  />
                  <span className="min-w-0 flex-1 text-left text-sm font-medium text-slate-800 group-hover:text-slate-950">
                    {category.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-slate-400 hover:text-slate-700"
                      onClick={() => onEdit(category)}
                      aria-label={`Editar ${category.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-slate-400 hover:text-rose-600"
                      onClick={event => {
                        event.stopPropagation()
                        onDelete(category.id, category.name)
                      }}
                      aria-label={`Excluir ${category.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
