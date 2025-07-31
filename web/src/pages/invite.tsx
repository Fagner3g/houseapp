import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import z from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { getInvite } from '@/http/invite'
import { useAcceptInvite } from '@/http/generated/api'
import { getAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/invite')({
  component: InvitePage,
  validateSearch: z => z.object({ token: z.string() }),
})

function InvitePage() {
  const { token } = useSearch({ strict: false })
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [slug, setSlug] = useState('')
  const authToken = getAuthToken()
  const { mutateAsync: acceptInvite } = useAcceptInvite()

  useEffect(() => {
    if (!token) return
    getInvite(token).then(res => {
      if (res.invite) {
        setEmail(res.invite.email)
        setSlug(res.invite.organizationSlug)
      } else {
        toast.error('Convite inválido')
      }
    })
  }, [token])

  useEffect(() => {
    if (authToken && token && slug) {
      acceptInvite({ slug, token })
        .then(() => {
          toast.success('Convite aceito!')
          navigate({ to: '/$org/goals', params: { org: slug } })
        })
        .catch(() => {
          toast.info('Você já pertence a esta organização')
          navigate({ to: '/$org/goals', params: { org: slug } })
        })
    }
  }, [authToken, token, slug, acceptInvite, navigate])

  useEffect(() => {
    if (!authToken && token) {
      localStorage.setItem('invite-token', token)
    }
  }, [authToken, token])

  if (!authToken) {
    return (
      <div className="p-4 flex flex-col items-center gap-4">
        <p>Convite para {slug || 'organização'} enviado para {email}</p>
        <Button onClick={() => navigate({ to: '/sign-in' })}>Fazer login</Button>
      </div>
    )
  }

  return <div className="p-4">Processando convite...</div>
}
