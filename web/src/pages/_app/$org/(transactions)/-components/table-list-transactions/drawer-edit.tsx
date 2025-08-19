import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/http/generated/model'
import {
  useUpdateTransaction,
  getListTransactionsQueryKey,
} from '@/http/generated/api'
import { showToastOnErrorSubmit } from '@/lib/utils'

const editTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  title: z.string().min(1),
  amount: z.coerce.number(),
  dueDate: z.coerce.date(),
  payToEmail: z.string().email(),
  description: z.string().optional(),
})

export type EditTransactionSchema = z.infer<typeof editTransactionSchema>

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DrawerEdit({ transaction, open, onOpenChange }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutate: updateTransaction } = useUpdateTransaction({
    mutation: {
      onMutate: async ({ slug, id, data }) => {
        await queryClient.cancelQueries({ queryKey: getListTransactionsQueryKey(slug) })
        const previous = queryClient.getQueryData<ListTransactions200>(
          getListTransactionsQueryKey(slug),
        )
        queryClient.setQueryData<ListTransactions200>(
          getListTransactionsQueryKey(slug),
          old => ({
            ...(old ?? { transactions: [] }),
            transactions:
              old?.transactions.map(t => (t.id === id ? { ...t, ...data } : t)) ?? [],
          }),
        )
        return { previous }
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(getListTransactionsQueryKey(slug), ctx.previous)
        }
        toast.error('Erro ao atualizar transação')
      },
      onSuccess: () => {
        toast.success('Transação atualizada!')
      },
      onSettled: (_data, _err, vars) => {
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(vars.slug),
        })
      },
    },
  })

  const form = useForm<EditTransactionSchema>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: { type: 'expense' },
  })

  useEffect(() => {
    if (transaction) {
      form.reset({
        type: transaction.type,
        title: transaction.title,
        amount: transaction.amount,
        dueDate: new Date(transaction.dueDate),
        payToEmail: '',
        description: transaction.description ?? '',
      })
    }
  }, [transaction, form])

  function handleSubmit(data: EditTransactionSchema) {
    if (!transaction) return
    updateTransaction({ slug, id: transaction.id, data })
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Editar transação</DrawerTitle>
        </DrawerHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, () => showToastOnErrorSubmit({ form }))}
            className="flex flex-col gap-4 p-4"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={dayjs(field.value).format('YYYY-MM-DD')}
                      onChange={e => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payToEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit">Salvar</Button>
          </form>
        </Form>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
