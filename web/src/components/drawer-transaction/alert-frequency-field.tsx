import type { UseFormReturn } from 'react-hook-form'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NewTransactionSchema } from './schema'

interface Props {
  form: UseFormReturn<NewTransactionSchema>
  disabled?: boolean
}

export function AlertFrequencyField({ form, disabled }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Alertas de vencimento</label>
      <Select
        value={form.watch('alertFrequency') ?? 'weekly'}
        onValueChange={v => form.setValue('alertFrequency', v as 'never' | 'daily' | 'weekly' | 'monthly')}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="never">Nunca</SelectItem>
          <SelectItem value="daily">Diário</SelectItem>
          <SelectItem value="weekly">Semanal</SelectItem>
          <SelectItem value="monthly">Mensal</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Frequência de alertas WhatsApp quando esta transação estiver vencida.
      </p>
    </div>
  )
}
