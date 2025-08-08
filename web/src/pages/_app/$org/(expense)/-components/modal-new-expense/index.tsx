import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useCreateExpense, useListUsersByOrg } from '@/http/generated/api'
import { showToastOnErrorSubmit } from '@/lib/utils'
import { AmountField } from './amount-field'
import { DescriptionField } from './description-field'
import { CalendarField } from './due-date-field'
import { RecurrenceField } from './isRecurring-filed'
import { PayToField } from './pay-to-field'
import { RecurrenceIntervalField } from './recurrence-interval-field'
import { RecurrenceSelectorField } from './recurrence-selector-field'
import { RecurrenceTypeField } from './recurrence-type-field'
import { RecurrenceUntilField } from './recurrence-until-field'
import { TitleField } from './title-filed'
import { TypeField } from './type-field'

const base = z.object({
  type: z.enum(['expense', 'income']).default('expense').nonoptional('O tipo é obrigatório'),
  title: z.string('O título é obrigatório').nonempty(),
  amount: z.string('Valor da transação é obrigatório').nonempty(),
  dueDate: z
    .date({ error: 'A data de vencimento é obrigatória' })
    .refine(date => date >= new Date(), {
      message: 'A data de vencimento deve ser no futuro',
    }),
  payToId: z.string('Defina o pra quem vai o registro').nonempty(),
  description: z.string().optional(),
})

const recurring = base.extend({
  isRecurring: z.literal(true),
  recurrenceSelector: z.enum(['date', 'repeat'], {
    error: 'Selecione um tipo de recorrência',
  }),
  recurrenceType: z.enum(['weekly', 'monthly', 'yearly'], {
    error: 'Selecione uma recorrência',
  }),
  recurrenceUntil: z.date().optional(),
  recurrenceInterval: z.number().int().optional(),
})

const nonRecurring = base.extend({
  isRecurring: z.literal(false),
  recurrenceSelector: z.never().optional(),
  recurrenceType: z.never().optional(),
  recurrenceUntil: z.never().optional(),
  recurrenceInterval: z.never().optional(),
})

const _schema = z.discriminatedUnion('isRecurring', [recurring, nonRecurring])
export const schema = _schema.superRefine((v, ctx) => {
  if (!v.isRecurring) return
  if (v.recurrenceSelector === 'repeat') {
    if (v.recurrenceInterval == null || Number.isNaN(v.recurrenceInterval)) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceInterval'],
        message: 'Informe o intervalo de repetição',
      })
    }
  }

  if (v.recurrenceSelector === 'date') {
    const now = new Date()
    const min = v.dueDate > now ? v.dueDate : now

    if (!v.recurrenceUntil) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceUntil'],
        message: 'Informe a data final',
      })
    } else if (v.recurrenceUntil <= min) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceUntil'],
        message: 'A data final deve ser posterior ao vencimento e à data atual',
      })
    }
  }
})

export type FormValues = z.infer<typeof schema>

export function ModalNewExpense() {
  const { slug } = useActiveOrganization()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isRecurring: false },
    shouldUnregister: true,
  })
  const { data: userData } = useListUsersByOrg(slug)
  const { mutateAsync: createExpense } = useCreateExpense()

  const isExpense = form.getValues('type') === 'expense'
  const isRecurring = form.watch('isRecurring')
  const mode = form.getValues('recurrenceSelector')

  useEffect(() => {
    if (!isRecurring) return

    // aguarda o próximo tick para garantir que os campos condicionais já registraram
    queueMicrotask(() => {
      form.setValue('recurrenceType', 'monthly', { shouldValidate: true, shouldTouch: true })
      form.setValue('recurrenceSelector', 'repeat', { shouldValidate: true, shouldTouch: true })
    })
  }, [isRecurring, form])

  useEffect(() => {
    // inicializa intervalo padrão se vazio
    queueMicrotask(() => {
      if (mode === 'repeat') {
        form.setValue('recurrenceInterval', 1, { shouldValidate: true, shouldTouch: true })
      } else {
        form.setValue('recurrenceInterval', undefined, { shouldValidate: true, shouldTouch: true })
      }
    })
  }, [form, mode])

  async function handleSubmit(values: FormValues) {
    toast('You submitted the following values', {
      description: (
        <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
    await createExpense({
      slug,
      data: { ...values },
    })
    form.reset()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Novo +</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar nova {isExpense ? 'Receita' : 'Despesa'}</DialogTitle>
          <DialogDescription>
            Crie um nova {isExpense ? 'receita' : 'despesa'} e defina os detalhes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, () => showToastOnErrorSubmit({ form }))}
            className="flex flex-col gap-4"
          >
            <TypeField form={form} />
            <TitleField form={form} />
            <div className="flex gap-5">
              <AmountField form={form} />
              <CalendarField form={form} />
            </div>
            <div className="flex gap-5">
              <PayToField form={form} data={userData} />
              <RecurrenceField form={form} />
            </div>

            {form.watch('isRecurring') && (
              <div className="flex gap-3">
                <RecurrenceTypeField form={form} />
                <RecurrenceSelectorField form={form} />
                {form.watch('recurrenceSelector') === 'date' ? (
                  <RecurrenceUntilField form={form} />
                ) : (
                  <RecurrenceIntervalField form={form} />
                )}
              </div>
            )}

            <DescriptionField form={form} />
            <Button type="submit">Cadastrar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
