import type * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import { AlertCircle } from 'lucide-react'
import * as React from 'react'
import {
  Controller,
  type ControllerProps,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
    // Only surface error styling/messages after form submit
    showError: !!fieldState.error && formState.isSubmitted,
    submitted: formState.isSubmitted,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </FormItemContext.Provider>
  )
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { showError, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={showError}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormRequiredMark({ className }: { className?: string }) {
  const { showError } = useFormField()

  return (
    <span
      aria-hidden="true"
      className={cn('text-gray-500', showError && 'text-destructive', className)}
    >
      *
    </span>
  )
}

function FormErrorBanner({
  message,
  className,
}: {
  message?: string | null
  className?: string
}) {
  const { isSubmitted } = useFormState()
  if (!isSubmitted || !message) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700',
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

function buildRequiredFieldsMessage(
  errors: FieldErrors,
  labels: Record<string, string>
): string | null {
  const missing = Object.keys(labels).filter(key => errors[key])
  if (missing.length === 0) return null
  const list = missing.map(key => labels[key!]).join(', ')
  return `Preencha os campos obrigatórios (${list}).`
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { showError, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !showError ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={showError}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId, showError } = useFormField()
  const body = showError && error ? String(error?.message ?? '') : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-destructive text-sm', className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  buildRequiredFieldsMessage,
  Form,
  FormItem,
  FormLabel,
  FormRequiredMark,
  FormErrorBanner,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
