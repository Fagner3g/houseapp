import { XIcon } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListTags } from '@/api/generated/api'
import type { ListTags200TagsItem } from '@/api/generated/model'
import type { NewTransactionSchema } from './schema'

export interface TagFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function TagField({ form }: TagFieldProps) {
  const { slug } = useActiveOrganization()
  const { data } = useListTags(slug)
  const availableTags = (data?.tags ?? []) as ListTags200TagsItem[]

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#000000')

  const selected = form.watch('tags') ?? []

  function addTag(tag: { name: string; color: string }) {
    if (selected.find(t => t.name === tag.name)) return
    form.setValue('tags', [...selected, tag])
  }

  function removeTag(name: string) {
    form.setValue(
      'tags',
      selected.filter(t => t.name !== name)
    )
  }

  return (
    <FormField
      control={form.control}
      name="tags"
      render={() => (
        <FormItem>
          <FormLabel>Tags</FormLabel>
          <FormControl>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1">
                {selected.map(tag => (
                  <Badge
                    key={tag.name}
                    style={{ backgroundColor: tag.color }}
                    className="text-white"
                  >
                    #{tag.name}
                    <button className="ms-1" type="button" onClick={() => removeTag(tag.name)}>
                      <XIcon size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  onChange={e => {
                    const found = availableTags.find(t => t.id === e.target.value)
                    if (found) {
                      addTag({ name: found.name, color: found.color })
                      e.currentTarget.value = ''
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecionar existente
                  </option>
                  {availableTags.map(tag => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Nova tag"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <Input
                  type="color"
                  className="w-12 p-0"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newName) return
                    addTag({ name: newName, color: newColor })
                    setNewName('')
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
