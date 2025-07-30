import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListUsers } from '@/http/generated/api'
import { getAuthToken } from '@/lib/auth'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/$org/(user)/users')({
  component: Users,
})

function Users() {
  const { orgSlug } = useActiveOrganization()
  const { data } = useListUsers(orgSlug)
  const [email, setEmail] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/org/${orgSlug}/invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      toast.success('Convite enviado!')
      setEmail('')
    } else {
      toast.error('Erro ao enviar convite')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleInvite} className="flex gap-2">
        <Input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
        <Button type="submit">Convidar</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {user.name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
