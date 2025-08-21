import { forwardRef, useEffect, useState } from 'react'

import { Input } from './input'

const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value?: number
  onValueChange?: (value: number) => void
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(brFormatter.format(value))

    useEffect(() => {
      setDisplayValue(brFormatter.format(value))
    }, [value])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, '')
      const numeric = Number(raw) / 100
      setDisplayValue(brFormatter.format(numeric))
      onValueChange?.(numeric)
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        inputMode="numeric"
      />
    )
  },
)

CurrencyInput.displayName = 'CurrencyInput'

