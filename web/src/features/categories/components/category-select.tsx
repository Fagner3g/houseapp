import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo, useState, type WheelEvent } from 'react'
import { toast } from 'sonner'

import {
  getListCategoriesQueryKey,
  useCreateCategory,
  useListCategories,
} from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

/** Above dialog/drawer overlays (dialog z-[9999], alert z-[10010]). */
const POPOVER_ABOVE_OVERLAY_CLASS = 'z-[10010] pointer-events-auto'

function stopScrollPropagation(event: WheelEvent) {
  event.stopPropagation()
}

export function CategorySelect({
  value,
  type,
  onChange,
  className,
  placeholder = 'Selecione',
  enabled = true,
  instanceKey,
  creatable = true,
}: {
  value?: string
  type: 'income' | 'expense'
  onChange: (categoryId: string) => void
  className?: string
  placeholder?: string
  enabled?: boolean
  instanceKey?: string
  creatable?: boolean
}) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data } = useListCategories(slug, { query: { enabled: !!slug && enabled } })
  const { mutateAsync: createCategory, isPending: isCreating } = useCreateCategory()

  const categories = useMemo(() => {
    const all = data?.categories ?? []
    const filtered = all.filter(category => category.type === type)
    const selected = value ? all.find(category => category.id === value) : undefined
    if (selected && selected.type !== type) {
      return [selected, ...filtered]
    }
    return filtered
  }, [data?.categories, type, value])

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === value),
    [categories, value]
  )

  const trimmedSearch = search.trim()
  const hasExactMatch = categories.some(
    category => category.name.toLowerCase() === trimmedSearch.toLowerCase()
  )
  const showCreateOption = creatable && trimmedSearch.length > 0 && !hasExactMatch

  const selectOrCreate = async (name: string) => {
    if (!slug) return

    const normalized = name.trim()
    if (!normalized) return

    const existing = categories.find(
      category => category.name.toLowerCase() === normalized.toLowerCase()
    )

    if (existing) {
      onChange(existing.id)
      setOpen(false)
      setSearch('')
      return
    }

    if (!creatable) return

    try {
      const result = await createCategory({
        slug,
        data: { name: normalized, type },
      })
      await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(slug) })
      onChange(result.category.id)
      setOpen(false)
      setSearch('')
    } catch {
      toast.error('Erro ao criar categoria')
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch('')
  }

  return (
    <Popover
      key={instanceKey}
      open={open}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!enabled || isCreating}
          className={cn(
            'border-input text-foreground data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm font-normal shadow-xs hover:bg-transparent',
            !selectedCategory && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {isCreating ? 'Criando...' : (selectedCategory?.name ?? placeholder)}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          POPOVER_ABOVE_OVERLAY_CLASS,
          'w-[min(20rem,calc(100vw-2rem))] min-w-[var(--radix-popover-trigger-width)] p-0'
        )}
        align="start"
        onWheel={stopScrollPropagation}
      >
        <Command shouldFilter className="max-h-72 overflow-hidden">
          <CommandInput
            placeholder="Buscar categoria..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-56 overscroll-contain" onWheel={stopScrollPropagation}>
            {!showCreateOption ? (
              <CommandEmpty>Nenhuma categoria encontrada</CommandEmpty>
            ) : null}
            <CommandGroup>
              {categories.map(category => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onChange(category.id)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === category.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
              {showCreateOption ? (
                <CommandItem
                  value={trimmedSearch}
                  keywords={[trimmedSearch, '__create__']}
                  onSelect={() => {
                    void selectOrCreate(trimmedSearch)
                  }}
                >
                  Criar &quot;{trimmedSearch}&quot;
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
