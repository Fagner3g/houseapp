import { Users } from 'lucide-react'

export function SplitEmptyState() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <Users className="size-4 text-slate-500" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-slate-700">Nenhuma divisão ainda</p>
        <p className="text-sm text-slate-500">
          Divida com alguém ou delegue a conta inteira para um membro da casa.
        </p>
      </div>
    </div>
  )
}
