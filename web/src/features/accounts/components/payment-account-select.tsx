import { AccountSelect } from './account-select'

interface PaymentAccountSelectProps {
  accounts: Array<{ id: string; type: string; name: string; institution?: string | null }>
  value: string | null | undefined
  onValueChange: (value: string | null) => void
  excludeAccountId?: string
  disabled?: boolean
  id?: string
}

export function PaymentAccountSelect({
  accounts,
  value,
  onValueChange,
  excludeAccountId,
  disabled,
  id,
}: PaymentAccountSelectProps) {
  return (
    <AccountSelect
      accounts={accounts}
      value={value}
      onValueChange={onValueChange}
      excludeAccountId={excludeAccountId}
      paymentOnly
      nullable
      id={id}
      disabled={disabled}
      placeholder="Selecione a conta de pagamento"
    />
  )
}
