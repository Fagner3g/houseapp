import { formatCurrency } from '@/lib/currency'

import type { InstallmentPreviewItem } from '../installment-preview'

export function InstallmentPreviewPanel({ items }: { items: InstallmentPreviewItem[] }) {
  const hasSplit = items.some(item => item.myShareAmount != null)

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-600">
        Prévia das parcelas
        {hasSplit ? ' (meu valor)' : ''}
      </p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li
            key={item.installmentNumber}
            className="flex items-center justify-between gap-3 text-sm text-slate-700"
          >
            <span className="shrink-0 text-slate-500">
              {item.installmentNumber}/{item.installmentsTotal}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span>
            <span className="shrink-0 text-right tabular-nums">
              {item.myShareAmount != null ? (
                <>
                  <span className="block font-medium">{formatCurrency(item.myShareAmount)}</span>
                  <span className="block text-xs font-normal text-slate-500">
                    meu valor · de {formatCurrency(item.amount)}
                    {item.splitAmount != null && item.splitAmount !== item.myShareAmount
                      ? ` · outra pessoa ${formatCurrency(item.splitAmount)}`
                      : ''}
                  </span>
                </>
              ) : (
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
