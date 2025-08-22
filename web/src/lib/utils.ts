import { type ClassValue, clsx } from 'clsx'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>
}

export const showToastOnErrorSubmit = <T extends FieldValues>({ form }: FormProps<T>) => {
  const errors = form.formState.errors
  console.log('VALIDATE_ERROS', errors)
  const firstKey = Object.keys(errors)[0] as Path<T> | undefined
  if (!firstKey) return
  const message = form.getFieldState(firstKey).error?.message
  if (message) {
    toast.error(String(message), { id: firstKey as string })
  }
}
