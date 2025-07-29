import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import Cookies from 'universal-cookie'
import z from 'zod'

import { Button } from '@/components/ui/button'
import { validateToken } from '@/http/generated/api'

export const Route = createFileRoute('/_auth/validate-link')({
  component: RouteComponent,
  validateSearch: z.object({
    token: z.string().or(z.undefined()),
  }),
})

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const { token = '' } = useSearch({ strict: false })
  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      validateToken({ token }).then(resp => {
        console.log('valid', resp)
        if (resp.data.valid) {
          const cookies = new Cookies()
          cookies.set('token', token, { path: '/', maxAge: 60 * 60 * 24 }) // 1 day
          setIsLoading(false)
          setIsError(false)

          setTimeout(() => {
            navigate({ to: '/dashboard' })
          }, 3000)
        } else {
          setIsLoading(false)
          setIsError(true)
        }
      })
    }
  }, [token, navigate])

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
      {isError ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <p>Link Válido</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4">
          <p>Link Inválido</p>
          <Button onClick={() => navigate({ to: '/sign-in' })}>Voltar</Button>
        </div>
      )}
    </div>
  )
}
