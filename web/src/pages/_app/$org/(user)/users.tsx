import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListUsersByOrgQueryKey,
  useListUsersByOrg,
  usePatchOrgSlugUsers,
} from '@/api/generated/api'
import type { ListUsersByOrg200, PatchOrgSlugUsersBody } from '@/api/generated/model'
import { LoadingErrorState } from '@/components/loading-error-state'
import { ModalEditUser } from '@/components/modal-edit-user'
import { ModalNewUser } from '@/components/modal-new-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export const Route = createFileRoute('/_app/$org/(user)/users')({
  component: Users,
})

function Users() {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()
  const { data, isLoading, error, refetch } = useListUsersByOrg(slug)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{
    id: string
    name: string
    email: string
    phone?: string | null
  } | null>(null)
  const [search, setSearch] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  type UserWithId = ListUsersByOrg200['users'][number] & { id: string }
  type PatchUserBody = PatchOrgSlugUsersBody & { userId: string }

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
            const body = data as PatchUserBody
            return {
              ...old,
              users: old.users.map(u =>
                (u as UserWithId).id === body.userId
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

  const handleDeleteUser = async () => {
    setIsDeleting(true)
    try {
      // TODO: Implementar API de exclusão quando disponível no backend
      toast.warning('Remoção de usuário ainda não disponível no backend')
    } catch {
      toast.error('Erro ao excluir usuário')
    } finally {
      setIsDeleting(false)
    }
  }

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

  return (
    <LoadingErrorState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar usuários"
      description="Não foi possível carregar a lista de usuários. Verifique sua conexão e tente novamente."
    >
      <div className="p-4 space-y-4">
        {/* Header com título */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Usuários</h1>
            <p className="text-muted-foreground">Gerencie os usuários da organização</p>
          </div>
        </div>

        {/* Barra de pesquisa e botão adicionar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Pesquisar por nome, e-mail ou telefone"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
          </div>
          <ModalNewUser />
        </div>

        {/* Lista de usuários */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <title>Usuários</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tente ajustar os termos de pesquisa.'
                  : 'Comece adicionando o primeiro usuário à organização.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredUsers.map(user => (
                <button
                  key={(user as UserWithId).id ?? user.name}
                  type="button"
                  className="group w-full text-left cursor-pointer rounded-lg border bg-card p-3 transition-all hover:bg-muted/50 hover:shadow-md hover:border-primary/20"
                  onClick={() => {
                    setEditingUser({
                      id: (user as UserWithId).id,
                      name: user.name,
                      email: user.email,
                      phone: user.phone,
                    })
                    setIsEditOpen(true)
                  }}
                  aria-label={`Editar usuário ${user.name}`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="text-sm font-semibold">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Informações do usuário */}
                    <div className="w-full space-y-1">
                      <div className="flex flex-col items-center gap-1">
                        <h3 className="font-medium text-sm truncate w-full">{user.name}</h3>
                        {user.isOwner && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            Admin
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <title>Email</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="truncate text-xs">{user.email}</span>
                        </div>

                        {user.phone && (
                          <div className="flex items-center justify-center gap-1">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <title>Telefone</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            <span className="text-xs">{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Indicador de clique */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        className="h-3 w-3 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <title>Editar</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <ModalEditUser
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          user={editingUser}
          isSubmitting={isUpdating}
          isDeleting={isDeleting}
          onSubmit={values => {
            setEditingUser(values)
            if (values && slug) {
              updateUser({
                slug,
                data: {
                  userId: values.id,
                  email: values.email,
                  name: values.name,
                  phone: values.phone ?? undefined,
                } as PatchOrgSlugUsersBody,
              })
              setIsEditOpen(false)
            }
          }}
          onDelete={handleDeleteUser}
        />
      </div>
    </LoadingErrorState>
  )
}
