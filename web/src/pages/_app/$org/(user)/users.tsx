import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListUsersByOrgQueryKey,
  useListUsersByOrg,
  usePatchOrgSlugUsers,
} from '@/api/generated/api'
import type { ListUsersByOrg200, PatchOrgSlugUsersBody } from '@/api/generated/model'
import { ModalEditUser } from '@/components/modal-edit-user'
import { ModalNewUser } from '@/components/modal-new-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export const Route = createFileRoute('/_app/$org/(user)/users')({
  component: Users,
})

function Users() {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()
  const { data, isLoading } = useListUsersByOrg(slug)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{
    name: string
    email: string
    phone?: string | null
  } | null>(null)
  const [search, setSearch] = useState('')
  const { mutate: updateUser, isPending: isUpdating } = usePatchOrgSlugUsers({
    mutation: {
      onMutate: async ({ slug: orgSlug, data }) => {
        await queryClient.cancelQueries({ queryKey: getListUsersByOrgQueryKey(orgSlug) })
        const previous = queryClient.getQueryData<ListUsersByOrg200>(
          getListUsersByOrgQueryKey(orgSlug)
        )
        queryClient.setQueryData(
          getListUsersByOrgQueryKey(orgSlug),
          (old: ListUsersByOrg200 | undefined) => {
            if (!old?.users) return old as unknown as ListUsersByOrg200
            return {
              ...old,
              users: old.users.map(u =>
                u.email === data.email
                  ? { ...u, name: data.name ?? u.name, phone: data.phone ?? u.phone }
                  : u
              ),
            } as ListUsersByOrg200
          }
        )
        return { previous }
      },
      onError: (_err, { slug: orgSlug }, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(getListUsersByOrgQueryKey(orgSlug), ctx.previous)
        }
        toast.error('Falha ao atualizar usuário')
      },
      onSuccess: (_data, { slug: orgSlug }) => {
        queryClient.invalidateQueries({ queryKey: getListUsersByOrgQueryKey(orgSlug) })
        toast.success('Usuário atualizado')
      },
    },
  })

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data?.users ?? []
    return (data?.users ?? []).filter(u => {
      const name = u.name?.toLowerCase() ?? ''
      const email = u.email?.toLowerCase() ?? ''
      const phone = (u.phone ?? '').toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [data?.users, search])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Pesquisar por nome, e-mail ou telefone"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <ModalNewUser />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="w-[160px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map(user => (
            <TableRow key={user.name}>
              <TableCell className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {user.name}
                {user.isOwner && <span className="text-sm text-zinc-400"> (Admin)</span>}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.phone || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingUser({ name: user.name, email: user.email, phone: user.phone })
                      setIsEditOpen(true)
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      toast.warning('Remoção de usuário ainda não disponível no backend')
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ModalEditUser
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={editingUser}
        isSubmitting={isUpdating}
        onSubmit={values => {
          setEditingUser(values)
          if (values && slug) {
            updateUser({
              slug,
              data: {
                email: values.email,
                name: values.name,
                phone: values.phone ?? undefined,
              } as PatchOrgSlugUsersBody,
            })
            setIsEditOpen(false)
          }
        }}
      />
    </div>
  )
}
