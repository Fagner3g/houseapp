import { type ClassValue, clsx } from 'clsx'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>
  errors?: Partial<Record<string, unknown>>
}

export const showToastOnErrorSubmit = <T extends FieldValues>({ form, errors }: FormProps<T>) => {
  const currentErrors = (errors as Record<string, unknown> | undefined) ?? form.formState.errors

  const findFirstMessage = (obj: unknown): { path: string; message: string } | null => {
    if (!obj || typeof obj !== 'object') return null
    // react-hook-form error object shape: { type, message, ref } or nested objects
    const anyObj = obj as Record<string, unknown>
    if ('message' in anyObj && typeof anyObj.message === 'string') {
      return { path: 'form', message: anyObj.message }
    }
    for (const key of Object.keys(anyObj)) {
      const child = anyObj[key]
      const found = findFirstMessage(child)
      if (found) return { path: key, message: found.message }
    }
    return null
  }

  const found = findFirstMessage(currentErrors)
  if (found) {
    toast.error(String(found.message), { id: found.path })
  } else {
    const firstKey = Object.keys(currentErrors ?? {})[0] as Path<T> | undefined
    if (firstKey) {
      const message = form.getFieldState(firstKey).error?.message
      if (message) toast.error(String(message), { id: firstKey as string })
    }
  }
}
