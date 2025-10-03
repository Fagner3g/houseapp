import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Mail, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

// import { useForm } from 'react-hook-form'
// import { useHookFormMask } from 'use-mask-input'

import { useSignIn } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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
  const [identifier, setIdentifier] = useState('')
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp')
  const [status, setStatus] = useState<Status>()
  const [cooldown, setCooldown] = useState(0)
  const navigate = useNavigate()
  const { mutateAsync: signIn } = useSignIn()
  const idInputId = 'signin-input'

  // Máscara de telefone implementada manualmente

  const isEmailValid = useMemo(() => /.+@.+\..+/.test(identifier.trim()), [identifier])
  const phoneDigits = useMemo(() => identifier.replace(/\D/g, ''), [identifier])
  const isPhoneValid = useMemo(
    () => phoneDigits.length === 10 || phoneDigits.length === 11,
    [phoneDigits]
  )

  const handleSignIn = async () => {
    try {
      setStatus(Status.Pending)
      const payload =
        channel === 'email'
          ? isEmailValid
            ? { email: identifier.trim() }
            : undefined
          : isPhoneValid
            ? { phone: phoneDigits }
            : undefined
      if (!payload) return
      await signIn({ data: payload })
      setStatus(Status.Success)
      setCooldown(45)
    } catch {
      setStatus(Status.Error)
    }
  }

  useEffect(() => {
    if (status !== Status.Success || cooldown <= 0) return
    const id = setInterval(() => setCooldown(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [status, cooldown])

  if (status === Status.Success) {
    return (
      <div className="h-full grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-center gap-2 text-center">
            {channel === 'email' ? (
              <Mail className="h-5 w-5 text-primary" />
            ) : (
              <Phone className="h-5 w-5 text-primary" />
            )}
            <h1 className="text-lg font-semibold">
              {channel === 'email' ? 'Verifique seu e-mail' : 'Verifique seu WhatsApp'}
            </h1>
          </div>
          <p className="mb-4 text-sm text-muted-foreground text-center">
            Enviamos um link de acesso para:
          </p>
          <Input value={identifier} disabled className="text-center" />
          <div className="mt-4 grid gap-2">
            <Button
              variant="outline"
              disabled={cooldown > 0 || status !== Status.Success}
              onClick={handleSignIn}
            >
              {cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : channel === 'email'
                  ? 'Reenviar e-mail'
                  : 'Reenviar WhatsApp'}
            </Button>
            <Button onClick={() => navigate({ to: '/sign-up' })} variant="ghost">
              Cadastrar nova conta
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (status === Status.Error) {
    return (
      <div className="h-full grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm text-center">
          <h1 className="text-lg font-semibold mb-1">Não foi possível enviar</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Tente novamente em instantes. Se o problema persistir, contate o suporte.
          </p>
          <Button onClick={() => setStatus(undefined)}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Enviaremos o link de acesso para seu {channel === 'email' ? 'e-mail' : 'WhatsApp'}
          </p>
        </div>

        <div className="grid gap-3">
          <ToggleGroup
            type="single"
            value={channel}
            onValueChange={(v: 'email' | 'whatsapp' | '') => {
              if (v === 'email' || v === 'whatsapp') {
                setChannel(v)
                setIdentifier('') // Limpar o input ao trocar de canal
              }
            }}
            className="w-full"
          >
            <ToggleGroupItem value="email">E-mail</ToggleGroupItem>
            <ToggleGroupItem value="whatsapp">WhatsApp</ToggleGroupItem>
          </ToggleGroup>
          <label className="text-sm font-medium text-left" htmlFor={idInputId}>
            {channel === 'email' ? 'E-mail' : 'WhatsApp'}
          </label>
          {channel === 'email' ? (
            <Input
              id={idInputId}
              placeholder="voce@empresa.com"
              inputMode="email"
              autoComplete="email"
              type="email"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          ) : (
            <Input
              id={idInputId}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              value={identifier}
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '')
                const formatted =
                  value.length <= 10
                    ? value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
                    : value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                setIdentifier(formatted)
              }}
            />
          )}
          <Button
            className="mt-1"
            disabled={
              (channel === 'email' ? !isEmailValid : !isPhoneValid) || status === Status.Pending
            }
            isLoading={status === Status.Pending}
            onClick={handleSignIn}
          >
            Enviar link
          </Button>
          <Button onClick={() => navigate({ to: '/sign-up' })} variant="ghost">
            Criar conta
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos termos e políticas.
        </p>
      </div>
    </div>
  )
}
