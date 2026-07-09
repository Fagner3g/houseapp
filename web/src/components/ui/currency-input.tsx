import { forwardRef } from 'react'

import { formatCurrency, parseCurrencyInput } from '@/lib/currency'

import { Input } from './input'

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value?: number | null
  onValueChange?: (value: number | null) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** When true, an empty input yields `null` instead of `0`. */
  allowEmpty?: boolean
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onChange, allowEmpty = false, placeholder = 'R$ 0,00', ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, '')
      const numeric = raw ? parseCurrencyInput(e.target.value) : allowEmpty ? null : 0
      onValueChange?.(numeric)
      onChange?.(e)
    }

    const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : 0
    const displayValue = allowEmpty && value == null ? '' : formatCurrency(numericValue)

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        inputMode="numeric"
        placeholder={placeholder}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
