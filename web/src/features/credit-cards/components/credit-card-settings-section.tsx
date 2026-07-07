import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ArrowLeft, Plus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getGetAccountQueryKey,
  getListAccountsQueryKey,
  getListCardsQueryKey,
  getListStatementsQueryKey,
  useListCards,
  useListStatements,
  useListUsersByOrg,
  useUpdateAccount,
  useUpdateCard,
} from '@/api/generated/api'
import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Form,
  FormControl,
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
import { AccountAppearanceFields } from '@/features/accounts/components/account-appearance-fields'
import { ImportStatementDialog } from '@/features/accounts/components/import-statement-dialog'
import { PaymentAccountField } from '@/features/accounts/components/payment-account-field'
import { CARD_BRANDS, institutionLabel } from '@/features/accounts/constants'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsStringToNumber, formatCentsString, reaisToMoneyString } from '@/lib/currency'
import { resolveStatementViewMonthKey, billingDaysFromStatementDates, formatStatementBillingDays, formatImportedPurchasePeriodRange } from '@/lib/billing-cycle'
import { formatOrgUserLabel } from '@/lib/org-users'
import { settingsFieldLabel, settingsPanel } from '@/lib/ui-classes'
import { useAuthStore } from '@/stores/auth'
import { useDrawerStore } from '@/stores/drawers'

const settingsSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  creditLimit: z.number().min(0, 'Informe o limite do cartão'),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  brand: z.string().optional(),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

interface CreditCardSettingsSectionProps {
  account: ListAccounts200AccountsItem
  onBack: () => void
  onUpdated: () => void
  onViewStatement?: (params: { accountId: string; monthKey: string }) => void
}

export function CreditCardSettingsSection({
  account,
  onBack,
  onUpdated,
  onViewStatement,
}: CreditCardSettingsSectionProps) {
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const queryClient = useQueryClient()
  const openCardDrawer = useDrawerStore(s => s.openCardDrawer)
  const { mutateAsync: updateAccount, isPending: isUpdatingAccount } = useUpdateAccount()
  const { mutateAsync: updateCard, isPending: isUpdatingCard } = useUpdateCard()
  const isPending = isUpdatingAccount || isUpdatingCard

  const { data: cardsData } = useListCards(slug, account.id, {
    query: { enabled: !!slug && !!account.id },
  })
  const { data: membersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug && !!account.id },
  })
  const { data: statementsData, refetch: refetchStatements } = useListStatements(slug, account.id, {
    query: { enabled: !!slug && !!account.id },
  })

  const cards = cardsData?.cards ?? []
  const members = membersData?.users ?? []
  const activeCards = cards.filter(card => card.status === 'active')
  const showLinkedCards = activeCards.length > 1

  const primaryCard = useMemo(() => {
    const fromList =
      activeCards.find(card => card.type === 'physical') ??
      activeCards[0]
    if (fromList) return fromList

    return (
      account.cards?.find(card => card.status === 'active' && card.type === 'physical') ??
      account.cards?.find(card => card.status === 'active') ??
      account.cards?.[0]
    )
  }, [account.cards, activeCards])

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: account.name,
      creditLimit: centsStringToNumber(account.creditLimit),
      closingDay: account.closingDay ?? 1,
      dueDay: account.dueDay ?? 10,
      color: account.color,
      icon: account.icon,
      brand: primaryCard?.brand ?? 'visa',
    },
  })

  useEffect(() => {
    form.reset({
      name: account.name,
      creditLimit: centsStringToNumber(account.creditLimit),
      closingDay: account.closingDay ?? 1,
      dueDay: account.dueDay ?? 10,
      color: account.color,
      icon: account.icon,
      brand: primaryCard?.brand ?? 'visa',
    })
  }, [account, form, primaryCard?.brand])

  const onSubmit = async (values: SettingsFormValues) => {
    if (!slug) return

    try {
      await updateAccount({
        slug,
        id: account.id,
        data: {
          name: values.name,
          creditLimit: reaisToMoneyString(values.creditLimit),
          closingDay: values.closingDay,
          dueDay: values.dueDay,
          color: values.color ?? null,
          icon: values.icon ?? null,
        },
      })

      if (primaryCard && values.brand && values.brand !== primaryCard.brand) {
        await updateCard({
          slug,
          accountId: account.id,
          id: primaryCard.id,
          data: { brand: values.brand },
        })
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey(slug, account.id) }),
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) }),
        queryClient.invalidateQueries({ queryKey: getListCardsQueryKey(slug, account.id) }),
      ])
      onUpdated()
      toast.success('Configurações salvas')
    } catch {
      toast.error('Erro ao salvar configurações')
    }
  }

  const handleImported = () => {
    refetchStatements()
    queryClient.invalidateQueries({ queryKey: getListStatementsQueryKey(slug, account.id) })
    onUpdated()
  }

  const handleCardMemberChange = async (cardId: string, userId: string | null) => {
    if (!slug) return
    try {
      await updateCard({
        slug,
        accountId: account.id,
        id: cardId,
        data: { userId },
      })
      await queryClient.invalidateQueries({ queryKey: getListCardsQueryKey(slug, account.id) })
      toast.success('Membro do cartão atualizado')
    } catch {
      toast.error('Erro ao atualizar membro do cartão')
    }
  }

  return (
    <div className="space-y-6 py-3">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pb-4 lg:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar ao extrato
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Configurações do cartão</h2>
            <p className="mt-0.5 text-sm text-slate-500">{account.name}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" form="credit-card-settings-form" disabled={isPending}>
              {isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
            <ImportStatementDialog accountId={account.id} onImported={handleImported} />
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 lg:px-6">
        <Form {...form}>
          <form
            id="credit-card-settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className={settingsPanel}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className={settingsFieldLabel}>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} className="max-w-md" />
                    </FormControl>
                    <p className="text-sm text-slate-500">
                      Identifica a fatura no app — não é o nome do cartão físico.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2">
                <AccountAppearanceFields
                  type="credit_card"
                  institution={account.institution}
                  color={form.watch('color')}
                  icon={form.watch('icon')}
                  onColorChange={value => form.setValue('color', value, { shouldDirty: true })}
                  onIconChange={value => form.setValue('icon', value, { shouldDirty: true })}
                />
              </div>

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={settingsFieldLabel}>Bandeira</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CARD_BRANDS.map(brand => (
                          <SelectItem key={brand.value} value={brand.value}>
                            {brand.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {account.institution && (
                <div>
                  <p className={settingsFieldLabel}>Instituição</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {institutionLabel(account.institution)}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={settingsFieldLabel}>Limite total</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="closingDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={settingsFieldLabel}>Dia de fechamento</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={31} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={settingsFieldLabel}>Dia de vencimento</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={31} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="sm:col-span-2">
                <p className={settingsFieldLabel}>Conta de pagamento padrão</p>
                <div className="mt-2 max-w-md">
                  <PaymentAccountField
                    slug={slug}
                    accountId={account.id}
                    value={account.paymentAccountId}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Conta bancária usada para pagar esta fatura.
                </p>
              </div>
            </div>

          </form>
        </Form>

        {showLinkedCards && (
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Cartões vinculados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Físicos, virtuais e adicionais desta fatura. Compartilham o mesmo limite e
                vencimento.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => openCardDrawer(account.id)}>
                <Plus className="mr-1.5 size-4" />
                Adicionar cartão
              </Button>
            </div>
            <div className="space-y-2">
              {activeCards.map(card => (
                <div
                  key={card.id}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{card.label}</p>
                      <p className="text-sm text-slate-500">
                        {card.lastFourDigits ? `Final ${card.lastFourDigits}` : card.type}
                        {' · '}
                        <span className="capitalize">{card.status}</span>
                      </p>
                    </div>
                    <div className="w-full sm:w-56">
                      <p className="mb-1 text-xs font-medium text-slate-500">Membro dono</p>
                      <Select
                        value={card.userId ?? 'none'}
                        onValueChange={value =>
                          handleCardMemberChange(card.id, value === 'none' ? null : value)
                        }
                        disabled={isUpdatingCard}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Compartilhado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Compartilhado / sem dono</SelectItem>
                          {members.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {formatOrgUserLabel(member, currentUserId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Faturas importadas</h3>
            <p className="mt-1 text-sm text-slate-500">
              Histórico de importações de fatura deste cartão.
            </p>
          </div>
          {statementsData?.statements?.length ? (
            <div className="space-y-2">
              {statementsData.statements.map(st => {
                const statementBillingDays =
                  st.closingDate && st.dueDate
                    ? billingDaysFromStatementDates(st.closingDate, st.dueDate)
                    : null
                const monthKey = statementBillingDays
                  ? resolveStatementViewMonthKey(
                      st,
                      statementBillingDays.closingDay,
                      statementBillingDays.dueDay
                    )
                  : account.closingDay != null && account.dueDay != null
                    ? resolveStatementViewMonthKey(st, account.closingDay, account.dueDay)
                    : st.dueDate
                      ? dayjs(st.dueDate).format('YYYY-MM')
                      : null

                return (
                <button
                  key={st.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => {
                    if (monthKey && onViewStatement) {
                      onViewStatement({ accountId: account.id, monthKey })
                    }
                  }}
                  disabled={!monthKey || !onViewStatement}
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {st.periodStart && st.periodEnd
                        ? formatImportedPurchasePeriodRange(st.periodStart, st.periodEnd)
                        : st.fileName ?? 'Fatura'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {st.transactionsCount} lançamentos
                      {st.closingDate
                        ? ` · Fech. ${dayjs(st.closingDate).format('DD/MM/YYYY')}`
                        : ''}
                      {st.dueDate ? ` · Venc. ${dayjs(st.dueDate).format('DD/MM/YYYY')}` : ''}
                    </p>
                    {st.closingDate && st.dueDate && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatStatementBillingDays(st.closingDate, st.dueDate)}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {formatCentsString(st.totalAmount)}
                  </p>
                </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma fatura importada.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
