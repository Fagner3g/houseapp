import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import z from 'zod'

import { Button } from '@/components/ui/button'
import { useValidateToken } from '@/http/generated/api'
import { setAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/_auth/validate-link')({
  component: RouteComponent,
  validateSearch: z.object({
    token: z.string().or(z.undefined()),
  }),
})

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const { token = '' } = useSearch({ strict: false })
  const navigate = useNavigate()

  const { mutateAsync: validateToken } = useValidateToken()

  useEffect(() => {
    setIsLoading(true)
    if (token) {
      validateToken({ data: { token } })
        .then(({ valid }) => {
          if (valid) {
            setAuthToken(token)
            setTimeout(() => {
              setIsLoading(false)
              setIsError(false)
              navigate({ to: '/goals' })
            }, 4000)
          } else {
            setIsLoading(false)
            setIsError(true)
          }
        })
        .catch(() => {
          setIsLoading(false)
          setIsError(true)
        })
    }
  }, [token, navigate, validateToken])

  if (isLoading) {
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
