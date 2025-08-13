import type { UseFormReturn } from 'react-hook-form'

import TagBadge from '@/components/tag-badge'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import type { NewTransactionSchema } from './schema'

export interface TagFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function TagField({ form }: TagFieldProps) {
  return (
    <FormField
      control={form.control}
      name="tags"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tags</FormLabel>
          <FormControl>
            <div>
              <TagBadge>{field.value}</TagBadge>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
