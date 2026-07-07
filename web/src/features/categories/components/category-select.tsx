import { useMemo } from 'react'

import { useListCategories } from '@/api/generated/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'

const EMPTY_VALUE = '__category_empty__'

export function CategorySelect({
  value,
  type,
  onChange,
  className,
  placeholder = 'Selecione',
  enabled = true,
  instanceKey,
}: {
  value?: string
  type: 'income' | 'expense'
  onChange: (categoryId: string) => void
  className?: string
  placeholder?: string
  enabled?: boolean
  instanceKey?: string
}) {
  const { slug } = useActiveOrganization()
  const { data } = useListCategories(slug, { query: { enabled: !!slug && enabled } })

  const categories = useMemo(() => {
    const all = data?.categories ?? []
    const filtered = all.filter(category => category.type === type)
    const selected = value ? all.find(category => category.id === value) : undefined
    if (selected && selected.type !== type) {
      return [selected, ...filtered]
    }
    return filtered
  }, [data?.categories, type, value])

  const selectKey = `${instanceKey ?? 'default'}-${value ?? EMPTY_VALUE}-${categories.length}`

  return (
    <Select
      key={selectKey}
      value={value ?? EMPTY_VALUE}
      onValueChange={next => {
        if (next === EMPTY_VALUE) return
        onChange(next)
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_VALUE} disabled className="hidden">
          {placeholder}
        </SelectItem>
        {categories.map(category => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
