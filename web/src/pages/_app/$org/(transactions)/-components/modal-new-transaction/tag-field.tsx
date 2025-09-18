import { useQueryClient } from '@tanstack/react-query'
import { Pipette } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import {
  getListTagsQueryKey,
  useCreateTag,
  useDeleteTag,
  useListTags,
  useUpdateTag,
} from '@/api/generated/api'
import type { ListTags200TagsItem } from '@/api/generated/model'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import MultipleSelector, { type Option } from '@/components/ui/multiselect'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import type { NewTransactionSchema } from './schema'

export interface TagFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

const randomColor = () => {
  const palette = [
    '#ef4444',
    '#f59e0b',
    '#22c55e',
    '#3b82f6',
    '#06b6d4',
    '#a855f7',
    '#14b8a6',
    '#f97316',
  ]
  return palette[Math.floor(Math.random() * palette.length)]
}

export function TagField({ form }: TagFieldProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const colorInputId = useId()
  const { data } = useListTags(slug)
  const availableTags = (data?.tags ?? []) as ListTags200TagsItem[]
  const [createdNames, setCreatedNames] = useState<string[]>([])
  const [configuring, setConfiguring] = useState<{
    id?: string
    originalName: string
    name: string
    color: string
  } | null>(null)
  const selected = form.watch('tags') ?? []
  const defaultOptions: Option[] = useMemo(
    () =>
      availableTags.map(tag => ({
        value: tag.name,
        label: tag.name,
        color: tag.color,
      })),
    [availableTags]
  )

  const createTagMutation = useCreateTag({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTagsQueryKey(slug) })
      },
    },
  })

  const updateTagMutation = useUpdateTag({
    mutation: {
      onMutate: async ({ slug: s, id, data }) => {
        const key = getListTagsQueryKey(s)
        await queryClient.cancelQueries({ queryKey: key })
        const previous = queryClient.getQueryData<typeof data>(key)
        queryClient.setQueryData(
          key,
          (old: { tags?: Array<{ id: string; name: string; color: string }> } | undefined) => {
            if (!old) return old
            return {
              ...old,
              tags: (old.tags || []).map(t => (t.id === id ? { ...t, ...(data as any) } : t)),
            }
          }
        )
        return { previous }
      },
      onError: (_err, vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(getListTagsQueryKey(vars.slug), ctx.previous)
        }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTagsQueryKey(slug) })
      },
    },
  })

  const deleteTagMutation = useDeleteTag({
    mutation: {
      onMutate: async ({ slug: s, id }) => {
        const key = getListTagsQueryKey(s)
        await queryClient.cancelQueries({ queryKey: key })
        const previous = queryClient.getQueryData(key)
        queryClient.setQueryData(key, (old: { tags?: Array<{ id: string }> } | undefined) => {
          if (!old) return old
          return { ...old, tags: (old.tags || []).filter(t => t.id !== id) }
        })
        return { previous }
      },
      onError: (_err, vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(getListTagsQueryKey(vars.slug), ctx.previous)
        }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTagsQueryKey(slug) })
      },
    },
  })

  return (
    <FormField
      control={form.control}
      name="tags"
      render={() => (
        <FormItem>
          <FormLabel>Tags</FormLabel>
          <FormControl>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <MultipleSelector
                  commandProps={{ label: 'Selecionar ou criar tags' }}
                  defaultOptions={defaultOptions}
                  options={defaultOptions}
                  placeholder="Selecione ou digite para criar"
                  creatable
                  hidePlaceholderWhenSelected
                  value={selected.map(t => ({ value: t.name, label: t.name, color: t.color }))}
                  onBadgeClick={opt => {
                    const backend = availableTags.find(t => t.name === opt.value)
                    setConfiguring({
                      id: backend?.id,
                      originalName: opt.value,
                      name: opt.value,
                      color: opt.color ?? '#000000',
                    })
                  }}
                  onOptionConfigClick={opt => {
                    const backend = availableTags.find(t => t.name === opt.value)
                    setConfiguring({
                      id: backend?.id,
                      originalName: opt.value,
                      name: opt.value,
                      color: opt.color ?? '#000000',
                    })
                  }}
                  onChange={opts => {
                    const next = opts.map(opt => {
                      const existing = availableTags.find(t => t.name === opt.value)
                      const previous = selected.find(s => s.name === opt.value)
                      const color = existing?.color ?? previous?.color ?? randomColor()

                      if (!existing && !createdNames.includes(opt.value)) {
                        createTagMutation.mutate({ slug, data: { name: opt.value, color } })
                        setCreatedNames(prev => [...prev, opt.value])
                      }

                      return { name: opt.value, color }
                    })
                    form.setValue('tags', next)
                  }}
                  emptyIndicator={<p className="text-center text-sm">Nenhuma tag encontrada</p>}
                />

                {configuring && (
                  <DropdownMenu open onOpenChange={open => !open && setConfiguring(null)}>
                    <DropdownMenuTrigger asChild>
                      <span />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <div className="p-2">
                        <div className="text-sm font-medium">Configurar tag</div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            value={configuring.name}
                            onChange={e => setConfiguring({ ...configuring, name: e.target.value })}
                          />
                          <input
                            id={`tag-config-color-${colorInputId}`}
                            type="color"
                            className="h-0 w-0 opacity-0"
                            value={configuring.color}
                            onChange={e =>
                              setConfiguring({ ...configuring, color: e.target.value })
                            }
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'].map(c => (
                            <button
                              key={c}
                              type="button"
                              className="rounded-full"
                              onClick={() => setConfiguring({ ...configuring, color: c })}
                              aria-label={`Selecionar cor ${c}`}
                              title={c}
                            >
                              <span
                                className="block rounded-full transition-all"
                                style={{
                                  backgroundColor: c,
                                  padding: configuring.color === c ? 4 : 2,
                                }}
                              >
                                <span className="block rounded-full bg-popover p-[2px]">
                                  <span
                                    className="block h-3.5 w-3.5 rounded-full"
                                    style={{ backgroundColor: c }}
                                  />
                                </span>
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border"
                            onClick={() =>
                              document.getElementById(`tag-config-color-${colorInputId}`)?.click()
                            }
                            title="Cor personalizada"
                            aria-label="Cor personalizada"
                          >
                            <Pipette size={12} />
                          </button>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <DropdownMenuItem
                          className="text-destructive hover:!bg-destructive/10"
                          onClick={() => {
                            if (!configuring?.id) return
                            // otimista: remove da seleção atual
                            form.setValue(
                              'tags',
                              (selected ?? []).filter(t => t.name !== configuring.originalName)
                            )
                            deleteTagMutation.mutate({ slug, id: configuring.id })
                            setConfiguring(null)
                          }}
                        >
                          Excluir
                        </DropdownMenuItem>
                        <div className="flex gap-2">
                          <DropdownMenuItem
                            onClick={() => setConfiguring(null)}
                            className="justify-center"
                          >
                            Cancelar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (!configuring?.id) return
                              // otimista: atualiza seleção pelo nome original
                              form.setValue(
                                'tags',
                                (selected ?? []).map(t =>
                                  t.name === configuring.originalName
                                    ? { name: configuring.name, color: configuring.color }
                                    : t
                                )
                              )
                              updateTagMutation.mutate({
                                slug,
                                id: configuring.id,
                                data: { name: configuring.name, color: configuring.color },
                              })
                              setConfiguring(null)
                            }}
                            className="bg-primary text-primary-foreground hover:!bg-primary/90 justify-center"
                          >
                            Salvar
                          </DropdownMenuItem>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
