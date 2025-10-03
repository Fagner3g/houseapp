import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TransactionCardProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function TransactionCard({ title, subtitle, children, footer }: TransactionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        {children}
        {footer ? <div className="pt-2 border-t">{footer}</div> : null}
      </CardContent>
    </Card>
  )
}
