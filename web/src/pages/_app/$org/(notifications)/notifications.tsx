import { useListPolicies, useDeletePolicy } from '@/http/notifications'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreatePolicyDialog } from './-components/create-policy-dialog'

export default function NotificationsPage() {
  const { slug } = useActiveOrganization()
  const { data } = useListPolicies(slug)
  const deletePolicy = useDeletePolicy()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Policies</h1>
        <CreatePolicyDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Escopo</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Repetição</TableHead>
            <TableHead>Ativa</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map(p => (
            <TableRow key={p.id}>
              <TableCell>{p.scope}</TableCell>
              <TableCell>{p.event}</TableCell>
              <TableCell>{p.repeat_every_minutes ?? '-'}</TableCell>
              <TableCell>{p.active ? 'Sim' : 'Não'}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePolicy.mutate({ slug, id: p.id })}
                >
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
