import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  getListNotificationPoliciesQueryKey,
  useDeleteNotificationPolicy,
  useListNotificationPolicies,
} from '@/http/generated/api'
import { CreatePolicyDialog } from './-components/create-policy-dialog'

export const Route = createFileRoute('/_app/$org/(notifications)/notifications')({
  component: NotificationsPage,
})

export default function NotificationsPage() {
  const { slug } = useActiveOrganization()
  const { data } = useListNotificationPolicies(slug)
  const queryClient = useQueryClient()
  const deletePolicy = useDeleteNotificationPolicy({
    mutation: {
      onError: () => {
        toast.error('Erro ao excluir política')
      },
      onSuccess: (_data, vars) => {
        toast.success('Política excluida com sucesso!')
        queryClient.invalidateQueries({
          queryKey: getListNotificationPoliciesQueryKey(vars.slug),
        })
      },
    },
  })

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
          {data?.policies?.map(p => (
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
