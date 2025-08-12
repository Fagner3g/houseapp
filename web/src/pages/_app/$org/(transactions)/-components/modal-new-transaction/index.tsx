import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

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
import {
  getListTransactionsQueryKey,
  useCreateTransaction,
  useListUsersByOrg,
} from '@/http/generated/api'
import { showToastOnErrorSubmit } from '@/lib/utils'
import { AmountField } from './amount-field'
import { DescriptionField } from './description-field'
import { CalendarField } from './due-date-field'
import { RecurrenceField } from './is-recurring-filed'
import { PayToField } from './pay-to-field'
import { RecurrenceIntervalField } from './recurrence-interval-field'
import { RecurrenceSelectorField } from './recurrence-selector-field'
import { RecurrenceTypeField } from './recurrence-type-field'
import { RecurrenceUntilField } from './recurrence-until-field'
import { type NewTransactionSchema, newTransactionSchema, RegisterType } from './schema'
import { TagField } from './tag-field'
import { TitleField } from './title-filed'
import { TypeField } from './type-field'

export function ModalNewTransaction() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { data: userData } = useListUsersByOrg(slug)

  const form = useForm<NewTransactionSchema>({
    resolver: zodResolver(newTransactionSchema),
    defaultValues: { type: RegisterType.EXPENSE, isRecurring: false },
  })

  const { mutate: createTransaction } = useCreateTransaction({
    mutation: {
      // roda ANTES do request
      onMutate: async ({ slug, data }) => {
        await queryClient.cancelQueries({ queryKey: getListTransactionsQueryKey(slug) })

        const previous = queryClient.getQueryData(getListTransactionsQueryKey(slug))

        queryClient.setQueryData(
          getListTransactionsQueryKey(slug),
          (olds: NewTransactionSchema[]) => {
            return [olds || [], data]
          }
        )
        return { previous, slug }
      },
      onError: (_err, _vars, ctx) => {
        if (ctx) {
          queryClient.setQueryData(getListTransactionsQueryKey(ctx.slug), ctx.previous)
        }
      },

      onSettled: (_data, _err, vars) => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(vars.slug) })
      },
    },
  })

  const isExpense = form.watch('type') === RegisterType.EXPENSE
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

  async function handleSubmit(data: NewTransactionSchema) {
    createTransaction({ slug, data })
    // form.reset()
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

            <TagField form={form} />

            <DescriptionField form={form} />
            <Button type="submit">Cadastrar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
