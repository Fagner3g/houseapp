import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  getGetAccountQueryKey,
  getListAccountsQueryKey,
  useUpdateAccount,
} from '@/api/generated/api'
import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import {
  AccountSettingsFormFields,
  accountSettingsSchema,
  type AccountSettingsFormValues,
} from '@/features/accounts/components/account-settings-form-fields'
import {
  ACCOUNT_TYPES,
  institutionToFormFields,
  resolveInstitutionValue,
} from '@/features/accounts/constants'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsStringToNumber, reaisToMoneyString } from '@/lib/currency'

interface AccountSettingsSectionProps {
  account: ListAccounts200AccountsItem
  onBack: () => void
  onUpdated: () => void
}

export function AccountSettingsSection({
  account,
  onBack,
  onUpdated,
}: AccountSettingsSectionProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutateAsync: updateAccount, isPending } = useUpdateAccount()
  const typeLabel =
    ACCOUNT_TYPES.find(item => item.type === account.type)?.label ?? account.type

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      name: account.name,
      institutionKey: '',
      institutionName: '',
      initialBalance: centsStringToNumber(account.initialBalance),
      pixKey: account.pixKey ?? '',
      pixKeyType: account.pixKeyType ?? 'email',
      color: account.color,
      icon: account.icon,
    },
  })

  useEffect(() => {
    const { institutionKey, institutionName } = institutionToFormFields(account.institution)
    form.reset({
      name: account.name,
      institutionKey,
      institutionName,
      initialBalance: centsStringToNumber(account.initialBalance),
      pixKey: account.pixKey ?? '',
      pixKeyType: account.pixKeyType ?? 'email',
      color: account.color,
      icon: account.icon,
    })
  }, [account, form])

  const onSubmit = async (values: AccountSettingsFormValues) => {
    if (!slug) return

    try {
      await updateAccount({
        slug,
        id: account.id,
        data: {
          name: values.name,
          institution: resolveInstitutionValue(values.institutionKey, values.institutionName),
          color: values.color ?? null,
          icon: values.icon ?? null,
          initialBalance:
            values.initialBalance != null
              ? reaisToMoneyString(values.initialBalance)
              : undefined,
          pixKey: values.pixKey || null,
          pixKeyType: values.pixKeyType || null,
        },
      })
      toast.success('Conta atualizada')
      queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
      queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey(slug, account.id) })
      onUpdated()
    } catch {
      toast.error('Erro ao atualizar conta')
    }
  }

  return (
    <div className="px-4 py-4 lg:px-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 rounded-lg text-slate-600"
        onClick={onBack}
      >
        <ArrowLeft className="mr-1.5 size-4" />
        Voltar
      </Button>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500">Tipo: {typeLabel}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-6">
          <AccountSettingsFormFields form={form} account={account} />
          <Button type="submit" className="rounded-lg" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
