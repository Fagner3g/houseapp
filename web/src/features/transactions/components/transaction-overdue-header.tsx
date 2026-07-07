import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { pageSubtitle } from '@/lib/ui-classes'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export function TransactionOverdueHeader() {
  const navigate = useNavigate()
  const { slug } = useActiveOrganization()

  return (
    <div className="space-y-1 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-lg"
          aria-label="Voltar para lançamentos"
          onClick={() => navigate({ to: '/$org/transactions', params: { org: slug } })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
          Lançamentos vencidos
        </h2>
      </div>
      <p className={pageSubtitle}>Pendências com data de vencimento anterior a hoje</p>
    </div>
  )
}
