import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListCategoriesQueryKey,
  useDeleteCategory,
  useListCategories,
} from '@/api/generated/api'
import type { ListCategories200CategoriesItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_GROUPS,
  groupCategoriesByType,
  type CategoryType,
} from '@/features/categories/constants'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

import { CategoryGroupPanel } from './category-group-panel'

export function CategoriesSettingsTab() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const openCategoryDrawer = useDrawerStore(s => s.openCategoryDrawer)
  const openEditCategoryDrawer = useDrawerStore(s => s.openEditCategoryDrawer)
  const { data, isLoading } = useListCategories(slug, { query: { enabled: !!slug } })
  const { mutateAsync: deleteCategory } = useDeleteCategory()

  const [createType, setCreateType] = useState<CategoryType>('expense')

  const categories = data?.categories ?? []
  const grouped = useMemo(() => groupCategoriesByType(categories), [categories])

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(slug) })
  }

  const handleEdit = (category: ListCategories200CategoriesItem) => {
    openEditCategoryDrawer(
      {
        id: category.id,
        name: category.name,
        type: category.type,
      },
      () => invalidateCategories()
    )
  }

  const handleDelete = async (id: string, name: string) => {
    if (!slug || !confirm(`Excluir categoria "${name}"?`)) return
    try {
      await deleteCategory({ slug, id })
      invalidateCategories()
      toast.success('Categoria excluída')
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  const handleCreate = () => {
    openCategoryDrawer(() => invalidateCategories(), createType)
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando categorias...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="rounded-lg bg-slate-900 hover:bg-slate-800" onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Nova categoria
        </Button>
      </div>

      <div className="grid gap-4">
        {CATEGORY_GROUPS.map(group => {
          const items = group.type === 'income' ? grouped.income : grouped.expense
          return (
            <div
              key={group.type}
              onMouseEnter={() => setCreateType(group.type)}
              onFocus={() => setCreateType(group.type)}
            >
              <CategoryGroupPanel
                type={group.type}
                title={group.title}
                dotClass={group.dotClass}
                iconBgClass={group.iconBgClass}
                iconClass={group.iconClass}
                categories={items}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
