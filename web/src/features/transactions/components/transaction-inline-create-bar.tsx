import { Check, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerInput } from '@/components/ui/date-picker-field'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { CategorySelect } from '@/features/categories/components/category-select'
import {
  type InlineTxType,
  useInlineTransactionCreate,
} from '@/features/transactions/hooks/use-inline-transaction-create'
import { cn } from '@/lib/utils'

export function TransactionInlineCreateBar({
  accountId: lockedAccountId,
  showStatusColumn = true,
  showActionsColumn = true,
}: {
  accountId?: string
  showStatusColumn?: boolean
  showActionsColumn?: boolean
}) {
  const {
    draft,
    patch,
    save,
    openDetails,
    onKeyDown,
    titleRef,
    isPending,
    accounts,
  } = useInlineTransactionCreate(lockedAccountId)

  const actionButtons = (
    <>
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1 bg-violet-600 px-2.5 hover:bg-violet-700"
        disabled={isPending}
        onClick={() => void save()}
      >
        <Check className="size-3.5" />
        <span className="sr-only sm:not-sr-only">Salvar</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-0.5 bg-white px-2.5"
        onClick={openDetails}
      >
        <span className="hidden sm:inline">Detalhes</span>
        <ChevronRight className="size-3.5" />
      </Button>
    </>
  )

  return (
    <TableRow className="bg-violet-50/60 hover:bg-violet-50/80">
      <TableCell className="py-2" />

      <TableCell className="whitespace-nowrap py-2">
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={draft.type}
            onValueChange={value => {
              if (!value) return
              patch({
                type: value as InlineTxType,
                categoryId: '',
              })
            }}
            className="h-8 shrink-0"
          >
            <ToggleGroupItem
              value="expense"
              className="h-8 px-2 text-xs data-[state=on]:bg-rose-100 data-[state=on]:text-rose-800"
            >
              Despesa
            </ToggleGroupItem>
            <ToggleGroupItem
              value="income"
              className="h-8 px-2 text-xs data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-800"
            >
              Receita
            </ToggleGroupItem>
          </ToggleGroup>
          <DatePickerInput
            value={draft.date}
            onChange={date => patch({ date })}
            placeholder="dd/mm/aaaa"
            buttonClassName="h-8 min-w-[6.5rem] flex-1 bg-white"
          />
        </div>
      </TableCell>

      <TableCell className="min-w-[10rem] py-2">
        <Input
          ref={titleRef}
          placeholder="Descrição"
          value={draft.title}
          onChange={e => patch({ title: e.target.value })}
          onKeyDown={onKeyDown}
          className="h-8 bg-white"
        />
      </TableCell>

      <TableCell className="hidden min-w-[9rem] py-2 md:table-cell">
        <CategorySelect
          value={draft.categoryId || undefined}
          type={draft.type}
          onChange={categoryId => patch({ categoryId })}
          placeholder="Categoria"
          className="h-8 w-full bg-white"
        />
      </TableCell>

      {!lockedAccountId && (
        <TableCell className="hidden min-w-[9rem] py-2 sm:table-cell">
          <AccountSelect
            accounts={accounts}
            value={draft.accountId}
            onValueChange={accountId => patch({ accountId })}
            placeholder="Conta"
            paymentOnly
            className="h-8 w-full bg-white"
          />
        </TableCell>
      )}

      <TableCell className="py-2 text-right">
        <div
          className={cn(
            'flex items-center justify-end gap-1.5',
            !showActionsColumn && 'flex-nowrap'
          )}
        >
          <CurrencyInput
            value={draft.amount}
            onValueChange={amount => patch({ amount: amount ?? 0 })}
            onKeyDown={onKeyDown}
            className="h-8 w-full min-w-[6.5rem] bg-white text-right sm:w-24"
          />
          {!showActionsColumn && actionButtons}
        </div>
      </TableCell>

      {showStatusColumn && <TableCell className="py-2" />}

      {showActionsColumn && (
        <TableCell className="py-2">
          <div className="flex items-center justify-end gap-1">{actionButtons}</div>
        </TableCell>
      )}
    </TableRow>
  )
}
