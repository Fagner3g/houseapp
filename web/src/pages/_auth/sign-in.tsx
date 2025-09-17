import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useSignIn } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

enum Status {
  Pending = 'pending',
  Success = 'success',
  Error = 'error',
}

export const Route = createFileRoute('/_auth/sign-in')({
  component: Index,
  head: () => ({
    meta: [{ title: 'Sign-in | House App' }],
  }),
})

function Index() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>()
  const navigate = useNavigate()
  const { mutateAsync: signIn } = useSignIn()

  const handleSignIn = async () => {
    try {
      setStatus(Status.Pending)
      await signIn({ data: { email } })
      setStatus(Status.Success)
    } catch {
      setStatus(Status.Error)
    }
  }

  if (status === Status.Success) {
    return (
      <div className="justify-center items-center text-center gap-3 flex flex-col">
        <h1>Enviamos o link para o e-mail</h1>
        <Input value={email} disabled className="text-center w-sm" />
      </div>
    )
  }

  if (status === Status.Error) {
    return (
      <div className="flex flex-col gap-3 justify-center text-center">
        <h1>Estamos com problema no servidor</h1>
        <p>Tente novamente mais tarde</p>
        <Button onClick={() => setStatus(undefined)}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="justify-center items-center text-center flex flex-col">
      <div className="flex flex-col gap-3 w-sm">
        <h1>Fazer login</h1>
        <Input placeholder="Email ou telefone" onChange={e => setEmail(e.target.value)} />
        <Button
          disabled={!email || status === Status.Pending}
          isLoading={status === Status.Pending}
          onClick={handleSignIn}
        >
          Entrar
        </Button>
        <Button className="mt-5" onClick={() => navigate({ to: '/sign-up' })} variant="outline">
          Cadastrar
        </Button>
      </div>
      <h4>v1.0.7 - CI/CD Simplificado</h4>
    </div>
  )
}
