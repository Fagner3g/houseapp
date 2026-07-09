import { zodResolver } from '@hookform/resolvers/zod'
import { CreditCard, Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getListAccountsQueryKey, useCreateAccount, useListAccounts } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsStringToNumber, reaisToMoneyString } from '@/lib/currency'
import { readHttpErrorMessage } from '@/lib/http'
import type { StatementAccountResolution, SuggestedCreditCardAccount } from '@/lib/parse-statement'
import { useQueryClient } from '@tanstack/react-query'

import {
  institutionBrandStyle,
  institutionLabel,
  isPaymentAccountType,
  suggestCreditCardAccountName,
} from '../constants'
import { PaymentAccountSelect } from './payment-account-select'

const formSchema = z.object({
  name: z.string().trim().min(1, 'Informe o apelido da fatura'),
  creditLimit: z
    .union([z.number().min(0.01, 'Informe o limite do cartão'), z.null()])
    .refine((value): value is number => value != null, {
      message: 'Informe o limite do cartão',
    }),
  closingDay: z.coerce.number().min(1, 'Dia inválido').max(31, 'Dia inválido'),
  dueDay: z.coerce.number().min(1, 'Dia inválido').max(31, 'Dia inválido'),
  paymentAccountId: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

type ImportOfxAccountSetupProps = {
  resolution: Extract<StatementAccountResolution, { mode: 'missing' }>
  importSource?: 'ofx' | 'xlsx'
  onCreated: (accountId: string) => void
  onCancel: () => void
}

function buildDefaultValues(
  suggested: SuggestedCreditCardAccount,
  accounts: Array<{ id: string; name: string; type: string; institution?: string | null }>
): FormValues {
  const paymentAccount = accounts.find(
    account =>
      account.institution === suggested.institution && isPaymentAccountType(account.type)
  )

  return {
    name: suggestCreditCardAccountName(suggested.name, suggested.institution, accounts),
    creditLimit:
      suggested.creditLimit != null ? centsStringToNumber(suggested.creditLimit) : null,
    closingDay: suggested.closingDay ?? 1,
    dueDay: suggested.dueDay ?? 1,
    paymentAccountId: paymentAccount?.id ?? null,
  }
}

export function ImportOfxAccountSetup({
  resolution,
  importSource = 'ofx',
  onCreated,
  onCancel,
}: ImportOfxAccountSetupProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutateAsync: createAccount, isPending } = useCreateAccount()
  const { data: accountsData } = useListAccounts(slug ?? '', { query: { enabled: !!slug } })

  const suggested = resolution.suggestedAccount
  const accounts = accountsData?.accounts ?? []

  const defaultValues = useMemo(
    () => buildDefaultValues(suggested, accounts),
    [accounts, suggested]
  )

  const nameWasAdjusted = defaultValues.name !== suggested.name
  const institutionStyle = institutionBrandStyle(suggested.institution)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form.formState.isDirty, form.reset])

  const isXlsx = importSource === 'xlsx'
  const fileLabel = isXlsx ? 'XLSX' : 'OFX'
  const detectedSuffix = isXlsx
    ? resolution.cardLastFour
      ? ` (final ${resolution.cardLastFour})`
      : ''
    : ''

  const handleCreate = async (values: FormValues) => {
    if (!slug) return

    try {
      const result = await createAccount({
        slug,
        data: {
          name: values.name.trim(),
          type: 'credit_card',
          institution: suggested.institution,
          currency: suggested.currency,
          creditLimit: reaisToMoneyString(values.creditLimit ?? 0),
          closingDay: values.closingDay,
          dueDay: values.dueDay,
          paymentAccountId: values.paymentAccountId,
          ofxAccountId: resolution.ofxAccountId,
          ...(resolution.cardLastFour ? { lastFourDigits: resolution.cardLastFour } : {}),
        },
      })

      await queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
      toast.success(`Fatura "${result.account.name}" criada`)
      onCreated(result.account.id)
    } catch (error) {
      const message = await readHttpErrorMessage(error, 'Erro ao criar conta de cartão')
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <CreditCard className="mt-0.5 size-5 shrink-0 text-violet-700" />
          <div className="space-y-1 text-sm text-violet-900">
            <p>
              {resolution.uploadedOnAccountName ? (
                <>
                  Este {fileLabel} não é do cartão{' '}
                  <span className="font-medium">{resolution.uploadedOnAccountName}</span> selecionado.
                  Cadastre o cartão identificado no arquivo{detectedSuffix} para continuar.
                </>
              ) : (
                <>
                  Este {fileLabel} pertence a um cartão{' '}
                  <span className="font-medium">{institutionLabel(suggested.institution)}</span>
                  {detectedSuffix ? (
                    <>
                      {' '}
                      <span className="font-medium">{detectedSuffix.trim()}</span>
                    </>
                  ) : null}{' '}
                  ainda não cadastrado.
                </>
              )}
            </p>
            <p className="text-violet-800/80">
              Confirme os dados da fatura para criar a conta e continuar a importação.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Instituição</p>
          <p className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${institutionStyle.bg} ${institutionStyle.text}`}
            >
              {institutionLabel(suggested.institution)}
            </span>
            <span className="text-sm text-slate-500">detectada no arquivo {fileLabel}</span>
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Apelido da fatura</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: Nubank Cartão" autoFocus />
                </FormControl>
                {nameWasAdjusted ? (
                  <FormDescription>
                    Ajustamos o nome porque já existe outra conta chamada &quot;{suggested.name}
                    &quot;.
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Como a fatura aparecerá no app. Pode ser diferente da conta bancária.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="creditLimit"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Limite de crédito</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onValueChange={field.onChange}
                    allowEmpty={field.value == null}
                  />
                </FormControl>
                {suggested.creditLimit != null ? (
                  <FormDescription>Valor detectado no arquivo {fileLabel}.</FormDescription>
                ) : isXlsx ? (
                  <FormDescription>
                    A exportação XLSX do Itaú geralmente não traz o limite — informe manualmente.
                  </FormDescription>
                ) : (
                  <FormDescription>
                    O OFX do Nubank geralmente não traz o limite — informe manualmente.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="closingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de fechamento</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={31} {...field} />
                </FormControl>
                {suggested.closingDay != null && (
                  <FormDescription>
                    Detectado no período da fatura ({fileLabel}).
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de vencimento</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={31} {...field} />
                </FormControl>
                {suggested.dueDay != null ? (
                  <FormDescription>
                    Detectado no arquivo {fileLabel}.
                  </FormDescription>
                ) : (
                  <FormDescription>Informe o dia em que a fatura vence todo mês.</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentAccountId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Conta para pagamento da fatura</FormLabel>
                <FormControl>
                  <PaymentAccountSelect
                    accounts={accounts}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Opcional. Usada para prever saldo ao pagar a fatura.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Criando fatura...
              </>
            ) : (
              'Criar fatura e continuar'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
