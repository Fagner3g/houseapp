import { ArrowDownCircle, ArrowUpCircle, Sigma } from 'lucide-react'

import type { GetOrgSlugReportsTransactions200ReportsKpis } from '@/api/generated/model'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { kpis?: GetOrgSlugReportsTransactions200ReportsKpis }

function format(amount?: number): string {
  const n = typeof amount === 'number' ? amount : 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export function TopBillsSummary({ kpis }: Props) {
  // Usar total pendente a receber informado pelo backend para evitar ruído de contextos
  const receberMes = kpis?.toReceiveTotal ?? 0
  const pagarMes = kpis?.toSpendTotal ?? 0
  const totalMes = receberMes - pagarMes

  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-emerald-500" /> A receber (mês)
            </CardTitle>
            <CardDescription>Entradas pendentes até o fim do mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{format(receberMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-rose-500" /> A pagar (mês)
            </CardTitle>
            <CardDescription>Saídas pendentes até o fim do mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{format(pagarMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sigma className="h-5 w-5 text-muted-foreground" /> Saldo do mês
            </CardTitle>
            <CardDescription>Saldo líquido (a receber - a pagar)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{format(totalMes)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
