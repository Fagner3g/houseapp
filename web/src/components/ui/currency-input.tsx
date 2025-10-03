import { forwardRef } from 'react'

import { Input } from './input'

const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value?: number
  onValueChange?: (value: number) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onValueChange, onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, '')
      const numeric = Number(raw) / 100
      onValueChange?.(numeric)
      onChange?.(e) // Call the external onChange if provided
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={brFormatter.format(value)}
        onChange={handleChange}
        inputMode="numeric"
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
