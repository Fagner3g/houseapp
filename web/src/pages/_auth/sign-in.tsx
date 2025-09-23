import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Mail, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'

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
  const idInputId = crypto.randomUUID()

  // form infra just to reuse the same phone mask used in user list
  const form = useForm<{ phone: string }>()
  const registerWithMask = useHookFormMask(form.register)

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
      await signIn({ data: payload as any })
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
      <div className="min-h-svh grid place-items-center bg-gradient-to-br from-muted to-background px-4">
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
              disabled={cooldown > 0 || status === Status.Pending}
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
      <div className="min-h-svh grid place-items-center bg-gradient-to-br from-muted to-background px-4">
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
    <div className="min-h-svh grid place-items-center bg-gradient-to-br from-muted to-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Receba um link mágico por e-mail ou WhatsApp
          </p>
        </div>

        <div className="grid gap-3">
          <ToggleGroup
            type="single"
            value={channel}
            onValueChange={(v: 'email' | 'whatsapp' | '') => {
              if (v === 'email' || v === 'whatsapp') setChannel(v)
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
              onChange={e => setIdentifier(e.target.value)}
            />
          ) : (
            <Input
              id={idInputId}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              {...registerWithMask('phone', ['(99) 99999-9999', '(99) 9999-9999'])}
              onChange={e => setIdentifier(e.target.value)}
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
