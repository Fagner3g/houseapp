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
    <div className="justify-center items-center text-center flex flex-col">
      <div className="flex flex-col gap-3 w-sm">
        <h1>Fazer cadastro</h1>
        <Input placeholder="Nome" />
        <Input placeholder="Email" />
        <Input placeholder="DDD" />
        <Input placeholder="Telefone" />
        <Button onClick={() => navigate({ to: '/sign-up' })}>Cadastrar</Button>
        <Button className="mt-5" onClick={() => navigate({ to: '/sign-in' })} variant="outline">
          Voltar
        </Button>
      </div>
    </div>
  )
}
