import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

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
import { useCreateInvite, useListUsersByOrg } from '@/api/generated/api'

const createInviteSchema = z.object({ email: z.email('E-mail inválido') })

type CreateInviteSchema = z.infer<typeof createInviteSchema>

export const Route = createFileRoute('/_app/$org/(user)/users')({
  component: Users,
})

function Users() {
  const { slug } = useActiveOrganization()
  const { data, isLoading } = useListUsersByOrg(slug)
  const { mutateAsync: createInvite } = useCreateInvite()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateInviteSchema>({
    resolver: zodResolver(createInviteSchema),
  })

  async function handleInvite({ email }: CreateInviteSchema) {
    try {
      await createInvite({ data: { email }, slug })
      toast.success('Convite enviado!')
      reset()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
        return
      }
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleSubmit(handleInvite)} className="flex gap-2">
        <div className="flex flex-col gap-2 w-lg">
          <Input placeholder="E-mail" {...register('email')} />
          {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
        </div>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
