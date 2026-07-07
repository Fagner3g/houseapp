import { useMemo } from 'react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { filterPaymentAccounts, groupAccountsForSelect } from '../constants'

const NONE_VALUE = '__none__'

interface AccountSelectBaseProps {
  accounts: Array<{ id: string; type: string; name: string; institution?: string | null }>
  excludeAccountId?: string
  paymentOnly?: boolean
  className?: string
  itemClassName?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  instanceKey?: string
  allOption?: { value: string; label: string }
  noneLabel?: string
}

interface AccountSelectProps extends AccountSelectBaseProps {
  value?: string
  onValueChange: (value: string) => void
  nullable?: false
}

interface NullableAccountSelectProps extends AccountSelectBaseProps {
  value?: string | null
  onValueChange: (value: string | null) => void
  nullable: true
}

export function AccountSelect({
  accounts,
  value,
  onValueChange,
  excludeAccountId,
  paymentOnly = false,
  className,
  itemClassName,
  placeholder = 'Selecione',
  disabled,
  id,
  instanceKey,
  allOption,
  nullable,
  noneLabel = 'Nenhuma',
}: AccountSelectProps | NullableAccountSelectProps) {
  const sections = useMemo(() => {
    let list = accounts
    if (paymentOnly) {
      list = filterPaymentAccounts(list, excludeAccountId)
    } else if (excludeAccountId) {
      list = list.filter(account => account.id !== excludeAccountId)
    }

    const selected = value ? accounts.find(account => account.id === value) : undefined
    if (selected && !list.some(account => account.id === selected.id)) {
      list = [selected, ...list]
    }

    return groupAccountsForSelect(list).filter(section => section.accounts.length > 0)
  }, [accounts, excludeAccountId, paymentOnly, value])

  const optionCount = useMemo(
    () => sections.reduce((count, section) => count + section.accounts.length, 0),
    [sections]
  )

  const selectValue = nullable ? (value ?? NONE_VALUE) : (value ?? allOption?.value)
  const selectKey = `${instanceKey ?? 'default'}-${selectValue ?? NONE_VALUE}-${optionCount}`

  const handleChange = (next: string) => {
    if (nullable) {
      ;(onValueChange as (value: string | null) => void)(next === NONE_VALUE ? null : next)
      return
    }
    onValueChange(next)
  }

  return (
    <Select key={selectKey} value={selectValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOption && (
          <SelectItem value={allOption.value} className={itemClassName}>
            {allOption.label}
          </SelectItem>
        )}
        {nullable && (
          <SelectItem value={NONE_VALUE} className={itemClassName}>
            {noneLabel}
          </SelectItem>
        )}
        {sections.map(section => (
          <SelectGroup key={section.key}>
            <SelectLabel>{section.label}</SelectLabel>
            {section.accounts.map(account => (
              <SelectItem key={account.id} value={account.id} className={itemClassName}>
                {account.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
