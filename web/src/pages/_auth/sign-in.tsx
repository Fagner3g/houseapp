import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_auth/sign-in')({
  component: Index,
  head: () => ({
    meta: [{ title: 'Sign-in | House App' }],
  }),
})

function Index() {
  const navigate = useNavigate()

  const handleSignIn = () => {
    navigate({ to: '/about' })
  }

  return (
    <div className="gap-3">
      <h1>Fazer login</h1>
      <Input placeholder="Email" />
      <Input placeholder="Senha" />
      <Button onClick={handleSignIn}>Entrar</Button>
      <Button onClick={() => navigate({ to: '/sign-up' })} variant="outline">
        Cadastrar
      </Button>
    </div>
  )
}
