import { Link } from '@tanstack/react-router'

import { useListUsersByOrg } from '@/api/generated/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export function MembersSettingsTab() {
  const { slug } = useActiveOrganization()
  const { data, isLoading } = useListUsersByOrg(slug, { query: { enabled: !!slug } })

  const users = data?.users ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros</CardTitle>
        <CardDescription>Usuários com acesso à organização</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum membro encontrado.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {users.map(user => (
              <li key={user.id} className="flex items-center gap-3 p-3">
                <Avatar className="size-9">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{user.name}</p>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                </div>
                <span className="text-xs capitalize text-slate-400">{user.role}</span>
              </li>
            ))}
          </ul>
        )}

        <Link
          to={`/${slug}/users`}
          className="inline-block text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Gerenciar convites e permissões →
        </Link>
      </CardContent>
    </Card>
  )
}
