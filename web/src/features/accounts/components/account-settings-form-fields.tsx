import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
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
import { AccountAppearanceFields } from '@/features/accounts/components/account-appearance-fields'
import {
  INSTITUTION_OTHER,
  INSTITUTIONS,
  PIX_KEY_TYPES,
  resolveInstitutionValue,
} from '@/features/accounts/constants'

export const accountSettingsSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  institutionKey: z.string().optional(),
  institutionName: z.string().optional(),
  initialBalance: z.number().optional(),
  pixKey: z.string().optional(),
  pixKeyType: z.string().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})

export type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>

interface AccountSettingsFormFieldsProps {
  form: UseFormReturn<AccountSettingsFormValues>
  account: ListAccounts200AccountsItem
}

export function AccountSettingsFormFields({ form, account }: AccountSettingsFormFieldsProps) {
  const isCash = account.type === 'cash'
  const isChecking = account.type === 'checking'
  const institutionKey = form.watch('institutionKey')
  const institutionName = form.watch('institutionName')
  const selectedInstitution = resolveInstitutionValue(institutionKey, institutionName)

  return (
    <>
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
                      <SelectValue placeholder="Selecione o banco (opcional)" />
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
                  Agrupa contas do mesmo banco — ex.: corrente e poupança no Nubank.
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

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da conta</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Conta Corrente Itaú..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <AccountAppearanceFields
        type={account.type}
        institution={selectedInstitution}
        color={form.watch('color')}
        icon={form.watch('icon')}
        onColorChange={value => form.setValue('color', value)}
        onIconChange={value => form.setValue('icon', value)}
      />

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

      {isChecking && (
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
  )
}
