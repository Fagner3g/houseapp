import { useEffect, useMemo, useRef } from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'

import { useListAccounts, useListOrganizations } from '@/api/generated/api'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRequiredMark,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { stackySelectItem, stackySelectTrigger } from '@/lib/ui-classes'

import { buildTransferTitle, isAutoTransferTitle } from './transfer-title'

type AccountOption = {
  id: string
  type: string
  name: string
  institution?: string | null
}

type TransferDestinationFieldsProps = {
  control: Control<Record<string, unknown>>
  setValue: UseFormSetValue<Record<string, unknown>>
  getValues: (name: string) => unknown
  sourceOrgSlug: string
  sourceAccounts: AccountOption[]
  sourceAccountId?: string
  transferToAccountId?: string
  destinationOrgSlug?: string
  open: boolean
  instanceKey: string
}

export function TransferDestinationFields({
  control,
  setValue,
  getValues,
  sourceOrgSlug,
  sourceAccounts,
  sourceAccountId,
  transferToAccountId,
  destinationOrgSlug,
  open,
  instanceKey,
}: TransferDestinationFieldsProps) {
  const destSlug = destinationOrgSlug || sourceOrgSlug
  const { data: orgsData } = useListOrganizations({ query: { enabled: open } })
  const organizations = orgsData?.organizations ?? []

  const { data: destAccountsData } = useListAccounts(destSlug, {
    query: { enabled: !!destSlug && open },
  })

  const destAccounts = useMemo(() => {
    if (destSlug === sourceOrgSlug) return sourceAccounts
    return destAccountsData?.accounts ?? []
  }, [destSlug, sourceOrgSlug, sourceAccounts, destAccountsData?.accounts])

  const sourceOrgName = organizations.find(org => org.slug === sourceOrgSlug)?.name
  const destOrgName = organizations.find(org => org.slug === destSlug)?.name
  const fromAccountName = sourceAccounts.find(account => account.id === sourceAccountId)?.name
  const toAccountName = destAccounts.find(account => account.id === transferToAccountId)?.name
  const isCrossOrg = destSlug !== sourceOrgSlug

  const suggestedTitle = useMemo(
    () =>
      buildTransferTitle({
        fromOrgName: sourceOrgName,
        toOrgName: destOrgName,
        fromAccountName,
        toAccountName,
        isCrossOrg,
      }),
    [sourceOrgName, destOrgName, fromAccountName, toAccountName, isCrossOrg]
  )

  const lastAutoTitleRef = useRef<string>('')

  useEffect(() => {
    if (!open) return
    if (!sourceAccountId && !transferToAccountId) return

    const currentTitle = String(getValues('title') ?? '')
    const shouldUpdate =
      !currentTitle.trim() ||
      isAutoTransferTitle(currentTitle) ||
      currentTitle === lastAutoTitleRef.current

    if (!shouldUpdate) return
    if (currentTitle === suggestedTitle) {
      lastAutoTitleRef.current = suggestedTitle
      return
    }

    setValue('title', suggestedTitle, { shouldDirty: true })
    lastAutoTitleRef.current = suggestedTitle
  }, [
    open,
    suggestedTitle,
    sourceAccountId,
    transferToAccountId,
    getValues,
    setValue,
  ])

  return (
    <div className="grid gap-3">
      {organizations.length > 1 && (
        <FormField
          control={control}
          name="transferToOrganizationSlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Organização destino <FormRequiredMark />
              </FormLabel>
              <Select
                value={field.value || sourceOrgSlug}
                onValueChange={value => {
                  field.onChange(value)
                  setValue('transferToAccountId', undefined)
                }}
              >
                <FormControl>
                  <SelectTrigger className={stackySelectTrigger}>
                    <SelectValue placeholder="Org destino" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.slug} value={org.slug} className={stackySelectItem}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Conta origem <FormRequiredMark />
              </FormLabel>
              <FormControl>
                <AccountSelect
                  accounts={sourceAccounts}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="De"
                  paymentOnly
                  instanceKey={instanceKey}
                  className={stackySelectTrigger}
                  itemClassName={stackySelectItem}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="transferToAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Conta destino <FormRequiredMark />
              </FormLabel>
              <FormControl>
                <AccountSelect
                  accounts={destAccounts}
                  value={field.value}
                  onValueChange={field.onChange}
                  excludeAccountId={destSlug === sourceOrgSlug ? sourceAccountId : undefined}
                  placeholder="Para"
                  paymentOnly
                  instanceKey={`${instanceKey}-to`}
                  className={stackySelectTrigger}
                  itemClassName={stackySelectItem}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
