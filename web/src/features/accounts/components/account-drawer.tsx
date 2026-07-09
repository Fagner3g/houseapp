import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getListAccountsQueryKey, useCreateAccount, useGetAccount, useListAccounts, useUpdateAccount } from '@/api/generated/api'
import type { CreateAccountBodyType } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from '@/components/ui/drawer'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsStringToNumber, reaisToMoneyString } from '@/lib/currency'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'
import {
  stackyDrawerContentNested,
  stackyDrawerOverlay,
  stackyDrawerCloseButton,
  stackyDrawerFooter,
  stackyDrawerHeader,
  stackyDrawerTitle,
} from '@/lib/ui-classes'

import {
  ACCOUNT_TYPES,
  CARD_BRANDS,
  findCreditAccountsAtInstitution,
  INSTITUTION_OTHER,
  INSTITUTIONS,
  institutionToFormFields,
  institutionLabel,
  PIX_KEY_TYPES,
  resolveInstitutionValue,
} from '../constants'
import { defaultAccountIconKey } from '../account-appearance'
import { AccountAppearanceFields } from './account-appearance-fields'
import { PaymentAccountSelect } from './payment-account-select'

const accountSchema = z
  .object({
    type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment']),
    name: z.string().min(1, 'Nome obrigatório'),
    institutionKey: z.string().optional(),
    institutionName: z.string().optional(),
    initialBalance: z.number().optional(),
    pixKey: z.string().optional(),
    pixKeyType: z.string().optional(),
    brand: z.string().optional(),
  creditLimit: z.number().optional(),
  closingDay: z.coerce.number().min(1).max(31).optional(),
  dueDay: z.coerce.number().min(1).max(31).optional(),
  paymentAccountId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})
  .superRefine((values, ctx) => {
    if (values.type === 'credit_card') {
      if (values.creditLimit == null || values.creditLimit < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o limite do cartão',
          path: ['creditLimit'],
        })
      }
    }

    if (values.type === 'investment' && !resolveInstitutionValue(values.institutionKey, values.institutionName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o banco ou corretora do investimento',
        path: ['institutionKey'],
      })
    }
  })

type AccountFormValues = z.infer<typeof accountSchema>

const defaultValues: AccountFormValues = {
  type: 'checking',
  name: '',
  institutionKey: '',
  institutionName: '',
  initialBalance: 0,
  pixKey: '',
  pixKeyType: 'email',
  brand: 'visa',
  creditLimit: 0,
  closingDay: 1,
  dueDay: 10,
  paymentAccountId: null,
  color: null,
  icon: null,
}

export function AccountDrawer({ nested = false }: { nested?: boolean }) {
  const { slug } = useActiveOrganization()
  const open = useDrawerStore(s => s.accountDrawerOpen)
  const mode = useDrawerStore(s => s.accountDrawerMode)
  const defaultType = useDrawerStore(s => s.accountDrawerDefaultType)
  const defaultInstitution = useDrawerStore(s => s.accountDrawerDefaultInstitution)
  const editingAccountId = useDrawerStore(s => s.editingAccountId)
  const transactionOpen = useDrawerStore(s => s.transactionDrawerOpen)
  const close = useDrawerStore(s => s.closeAccountDrawer)
  const onCreated = useDrawerStore(s => s.accountDrawerCallback)
  const queryClient = useQueryClient()
  const { mutateAsync: createAccount, isPending: isCreating } = useCreateAccount()
  const { mutateAsync: updateAccount, isPending: isUpdating } = useUpdateAccount()
  const { data: existingAccounts } = useListAccounts(slug, {
    query: { enabled: !!slug && open },
  })
  const { data: editingAccountData, isLoading: isLoadingAccount } = useGetAccount(
    slug,
    editingAccountId ?? '',
    { query: { enabled: !!slug && open && mode === 'edit' && !!editingAccountId } }
  )
  const [selectedType, setSelectedType] = useState<CreateAccountBodyType>('checking')

  const isEdit = mode === 'edit'
  const isPending = isCreating || isUpdating

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues,
  })

  const institutionKey = form.watch('institutionKey')
  const institutionName = form.watch('institutionName')
  const accountName = form.watch('name')

  const isCreditCard = selectedType === 'credit_card'
  const isCash = selectedType === 'cash'
  const isInvestment = selectedType === 'investment'

  const selectedInstitution = resolveInstitutionValue(institutionKey, institutionName)

  const existingCreditAtInstitution = useMemo(() => {
    if (!isCreditCard || !selectedInstitution) return []
    return findCreditAccountsAtInstitution(
      existingAccounts?.accounts ?? [],
      selectedInstitution
    )
  }, [existingAccounts?.accounts, isCreditCard, selectedInstitution])

  const hasSimilarName = useMemo(() => {
    const normalized = accountName.trim().toLowerCase()
    if (!normalized) return false
    return existingCreditAtInstitution.some(
      account =>
        account.name.trim().toLowerCase() === normalized && account.id !== editingAccountId
    )
  }, [accountName, existingCreditAtInstitution, editingAccountId])

  useEffect(() => {
    if (!open) return

    if (isEdit && editingAccountData?.account) {
      const account = editingAccountData.account
      const { institutionKey, institutionName } = institutionToFormFields(account.institution)
      const primaryCard = account.cards?.find(card => card.status === 'active') ?? account.cards?.[0]

      form.reset({
        type: account.type,
        name: account.name,
        institutionKey,
        institutionName,
        initialBalance: centsStringToNumber(account.initialBalance),
        pixKey: account.pixKey ?? '',
        pixKeyType: account.pixKeyType ?? 'email',
        brand: primaryCard?.brand ?? 'visa',
        creditLimit: centsStringToNumber(account.creditLimit),
        closingDay: account.closingDay ?? 1,
        dueDay: account.dueDay ?? 10,
        paymentAccountId: account.paymentAccountId,
        color: account.color,
        icon: account.icon,
      })
      setSelectedType(account.type)
      return
    }

    const initialType = defaultType ?? 'checking'
    const { institutionKey, institutionName } = institutionToFormFields(defaultInstitution)
    form.reset({
      ...defaultValues,
      type: initialType,
      institutionKey,
      institutionName,
      icon: defaultAccountIconKey(initialType),
    })
    setSelectedType(initialType)
  }, [open, isEdit, editingAccountData, form, defaultType, defaultInstitution])

  const onSubmit = async (values: AccountFormValues) => {
    if (!slug) return
    try {
      const institution = resolveInstitutionValue(values.institutionKey, values.institutionName)

      if (isEdit && editingAccountId) {
        await updateAccount({
          slug,
          id: editingAccountId,
          data: {
            name: values.name,
            institution,
            color: values.color ?? null,
            icon: values.icon ?? null,
            ...(isCreditCard
              ? {
                  creditLimit: reaisToMoneyString(values.creditLimit ?? 0),
                  closingDay: values.closingDay,
                  dueDay: values.dueDay,
                  paymentAccountId: values.paymentAccountId ?? null,
                }
              : {
                  initialBalance: values.initialBalance
                    ? reaisToMoneyString(values.initialBalance)
                    : '0',
                  pixKey: values.pixKey || null,
                  pixKeyType: values.pixKeyType || null,
                }),
          },
        })
        toast.success(isCreditCard ? 'Fatura atualizada' : 'Conta atualizada')
        onCreated?.(editingAccountId)
      } else {
        const result = await createAccount({
          slug,
          data: {
            name: values.name,
            type: values.type,
            institution,
            color: values.color ?? null,
            icon: values.icon ?? null,
            initialBalance: values.initialBalance
              ? reaisToMoneyString(values.initialBalance)
              : '0',
            pixKey: values.pixKey || null,
            pixKeyType: values.pixKeyType || null,
            brand: isCreditCard ? values.brand : null,
            creditLimit: isCreditCard ? reaisToMoneyString(values.creditLimit ?? 0) : null,
            closingDay: isCreditCard ? values.closingDay : null,
            dueDay: isCreditCard ? values.dueDay : null,
            paymentAccountId: isCreditCard ? values.paymentAccountId ?? null : null,
          },
        })
        toast.success(isCreditCard ? 'Fatura de cartão criada' : 'Conta criada')
        onCreated?.(result.account.id)
      }

      queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
      close()
    } catch {
      toast.error(isEdit ? 'Erro ao atualizar conta' : 'Erro ao criar conta')
    }
  }

  if (nested && !transactionOpen) return null
  if (!nested && transactionOpen) return null

  const panel = (
    <DrawerContent
      className={stackyDrawerContentNested}
      hideOverlay={nested}
      overlayClassName={stackyDrawerOverlay}
      onOverlayDismiss={close}
    >
      <DrawerHeader className={stackyDrawerHeader}>
        <DrawerTitle className={stackyDrawerTitle}>
          {isEdit
            ? isCreditCard
              ? 'Editar fatura'
              : 'Editar conta'
            : 'Nova conta'}
        </DrawerTitle>
        <button
          type="button"
          aria-label="Fechar"
          className={stackyDrawerCloseButton}
          onClick={close}
        >
          <X className="size-5" />
        </button>
      </DrawerHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {isEdit && isLoadingAccount ? (
              <p className="text-sm text-slate-500">Carregando conta...</p>
            ) : (
              <>
            {!isEdit && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Débito e Pix: use conta bancária. Crédito: cadastre a fatura (limite e vencimento).
              Cartões físicos e virtuais entram depois, dentro da fatura.
            </p>
            )}

            {!isEdit && (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Tipo de conta</p>
              <div
                className={cn(
                  'grid gap-3',
                  defaultType === 'credit_card' ? 'grid-cols-1' : 'grid-cols-2'
                )}
              >
                {(defaultType === 'credit_card'
                  ? ACCOUNT_TYPES.filter(item => item.type === 'credit_card')
                  : ACCOUNT_TYPES
                ).map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(item.type)
                      form.setValue('type', item.type)
                    }}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
                      selectedType === item.type
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <item.icon className="size-5 text-slate-700" />
                    <span className="font-medium text-slate-900">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.description}</span>
                  </button>
                ))}
              </div>
              {isCreditCard && (
                <p className="mt-3 text-sm text-slate-500">
                  Uma fatura com limite e vencimento próprios. O cartão físico principal é criado
                  automaticamente; virtuais e adicionais entram no detalhe da conta.
                </p>
              )}
            </div>
            )}

            {isEdit && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Tipo: {ACCOUNT_TYPES.find(item => item.type === selectedType)?.label ?? selectedType}
              </div>
            )}

            {!isCash && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="institutionKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instituição</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isInvestment ? 'Selecione o banco ou corretora' : 'Selecione o banco (opcional)'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INSTITUTIONS.map(item => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {isInvestment
                          ? 'Associe ao banco ou corretora — ex.: Nu Invest fica no Nubank.'
                          : 'Agrupa contas do mesmo banco — ex.: corrente, fatura e Nu Invest no Nubank.'}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {institutionKey === INSTITUTION_OTHER && (
                  <FormField
                    control={form.control}
                    name="institutionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da instituição</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Mercado Pago" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {isCreditCard && existingCreditAtInstitution.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <p className="font-medium">
                  Já existem {existingCreditAtInstitution.length} fatura
                  {existingCreditAtInstitution.length > 1 ? 's' : ''} em{' '}
                  {institutionLabel(selectedInstitution)}:
                </p>
                <ul className="mt-1 list-inside list-disc text-amber-900/90">
                  {existingCreditAtInstitution.map(account => (
                    <li key={account.id}>
                      {account.name}
                      {account.dueDay != null ? ` (vence dia ${account.dueDay})` : ''}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-800">
                  Só crie outra fatura se for um produto diferente (ex.: outro vencimento ou limite).
                  Para mais cartões no mesmo produto, abra a fatura existente.
                </p>
              </div>
            )}

            {hasSimilarName && (
              <p className="text-sm font-medium text-rose-600">
                Já existe uma fatura com este nome nesta instituição.
              </p>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isCreditCard ? 'Nome da fatura' : isInvestment ? 'Nome do investimento' : 'Nome da conta'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isCreditCard
                          ? 'Ex: Nubank Ultravioleta, Itaú Visa...'
                          : isInvestment
                            ? 'Ex: Nu Invest, CDB Inter, Tesouro Direto...'
                            : 'Ex: Conta Corrente Itaú...'
                      }
                      {...field}
                    />
                  </FormControl>
                  {isInvestment && (
                    <FormDescription>
                      Nome do produto — a instituição (banco/corretora) é definida acima.
                    </FormDescription>
                  )}
                  {isCreditCard && (
                    <FormDescription>
                      Identifica a fatura no app — não é o nome do cartão físico.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <AccountAppearanceFields
              type={selectedType}
              institution={selectedInstitution}
              color={form.watch('color')}
              icon={form.watch('icon')}
              onColorChange={value => form.setValue('color', value)}
              onIconChange={value => form.setValue('icon', value)}
            />

            {isCreditCard ? (
              <>
                {!isEdit && (
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bandeira principal</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CARD_BRANDS.map(b => (
                            <SelectItem key={b.value} value={b.value}>
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                )}
                <FormField
                  control={form.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite total</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value ?? 0} onValueChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="closingDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia fechamento</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={31} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia vencimento</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={31} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="paymentAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta de pagamento padrão</FormLabel>
                      <FormControl>
                        <PaymentAccountSelect
                          accounts={existingAccounts?.accounts ?? []}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Conta usada para pagar a fatura. Opcional — ajuda na previsão de saldo.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo inicial</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value ?? 0} onValueChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {selectedType === 'checking' && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pixKey"
                      render={({ field }) => (
                        <FormItem className="col-span-2 sm:col-span-1">
                          <FormLabel>Chave Pix</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pixKeyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PIX_KEY_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}
              </>
            )}
          </div>

          <DrawerFooter className={stackyDrawerFooter}>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending || hasSimilarName || (isEdit && isLoadingAccount)}
              >
                {isEdit
                  ? 'Salvar alterações'
                  : isCreditCard
                    ? 'Criar fatura de cartão'
                    : 'Criar conta'}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </Form>
    </DrawerContent>
  )

  if (nested) {
    return (
      <DrawerNestedRoot open={open} onOpenChange={v => !v && close()} direction="right">
        {panel}
      </DrawerNestedRoot>
    )
  }

  return (
    <Drawer open={open} onOpenChange={v => !v && close()} direction="right" modal>
      {panel}
    </Drawer>
  )
}
