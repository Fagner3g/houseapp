import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_auth/sign-up')({
  component: Index,
  head: () => ({
    meta: [{ title: 'Sign-in | House App' }],
  }),
})

function Index() {
  const navigate = useNavigate()

  return (
    <div className="gap-3">
      <h1>Fazer login</h1>
      <Input placeholder="Email" />
      <Input placeholder="Senha" />
      <Button onClick={() => navigate({ to: '/sign-in' })} variant="outline">
        Cadastrar
      </Button>
    </div>
  )
}
