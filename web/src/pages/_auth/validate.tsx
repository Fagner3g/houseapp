import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { Loader } from 'lucide-react'
import { useEffect } from 'react'
import z from 'zod'

import { useGetProfile, useValidateToken } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { setAuthToken } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/_auth/validate')({
  component: RouteComponent,
  validateSearch: z.object({
    token: z.string().optional(),
  }),
})

function RouteComponent() {
  const navigate = useNavigate()
  const { token = null } = useSearch({ strict: false })
  const setUser = useAuthStore(s => s.setUser)

  const { refetch: refetchProfile } = useGetProfile({
    query: { enabled: false },
  })

  const {
    mutate: validateToken,
    isPending,
    isError,
  } = useValidateToken({
    mutation: {
      onSuccess: async data => {
        if (data.valid && token) {
          // 1) Salva o token para habilitar chamadas autenticadas
          setAuthToken(token)

          // 2) Busca o profile usando o hook do Orval (imperativo via refetch)
          const prof = await refetchProfile()
          // Atualiza a store de profile com o usuário retornado pelo endpoint
          const userFromProfile = prof.data?.user ?? null
          setUser(userFromProfile)

          // 3) Navega: se tiver organização, vai pro dashboard; senão, abre criação
          if (data.slug) {
            navigate({ to: '/$org/dashboard', params: { org: data.slug } })
          } else {
            navigate({ to: '/new-org' })
          }
        }
      },
    },
  })

  useEffect(() => {
    if (!token) return

    validateToken({ data: { token } })
  }, [validateToken, token])

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <p>Aguarde, carregando...</p>
        <Loader className="animate-spin size-28" />
      </div>
    )
  }

  return (
    <div>
      {isError && (
        <div className="flex flex-col items-center justify-center gap-4">
          <p>Desculpe link expirado</p>
          <Button onClick={() => navigate({ to: '/sign-in' })}>Voltar para login</Button>
        </div>
      )}
    </div>
  )
}
