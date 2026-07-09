import { forwardRef } from 'react'

import { formatPhoneInput } from '@/lib/phone'

import { Input } from './input'

export interface PhoneInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value?: string
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onValueChange, onChange, placeholder = '(99) 99999-9999', ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const formatted = formatPhoneInput(e.target.value)
      onValueChange?.(formatted)
      onChange?.(e)
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={value ?? ''}
        onChange={handleChange}
        inputMode="tel"
        placeholder={placeholder}
      />
    )
  }
)

PhoneInput.displayName = 'PhoneInput'
