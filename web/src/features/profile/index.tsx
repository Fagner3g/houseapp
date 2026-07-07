import { useQueryClient } from '@tanstack/react-query'
import { Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  getGetProfileQueryKey,
  useGetProfile,
  usePatchOrgSlugUsers,
} from '@/api/generated/api'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { pageInset, pageShell, pageSubtitle } from '@/lib/ui-classes'
import { useAuthStore } from '@/stores/auth'

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

export function ProfilePage() {
  const { slug } = useActiveOrganization()
  const setUser = useAuthStore(s => s.setUser)
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useGetProfile()
  const user = data?.user

  const { firstName: initialFirst, lastName: initialLast } = splitName(user?.name ?? '')
  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  useEffect(() => {
    if (!user) return
    const { firstName: f, lastName: l } = splitName(user.name)
    setFirstName(f)
    setLastName(l)
    setEmail(user.email)
    setPhone(formatPhone(user.phone))
  }, [user])

  const { mutateAsync: saveProfile, isPending: isSaving } = usePatchOrgSlugUsers()

  const handleSave = async () => {
    if (!user || !slug) return

    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    const phoneDigits = phone.replace(/\D/g, '')

    if (!name) {
      toast.error('Informe seu nome')
      return
    }

    if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      toast.error('Informe um telefone válido com DDD')
      return
    }

    try {
      const updated = await saveProfile({
        slug,
        data: {
          userId: user.id,
          email: email.trim(),
          name,
          phone: phoneDigits || undefined,
        },
      })

      setUser({
        ...user,
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? '',
        avatarUrl: updated.avatarUrl,
      })
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() })
      toast.success('Perfil atualizado')
    } catch {
      toast.error('Não foi possível salvar as alterações')
    }
  }

  return (
    <LoadingErrorState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar perfil"
      description="Não foi possível carregar seus dados."
    >
      <div className={pageShell}>
        <div className={pageInset}>
          <p className={pageSubtitle}>Gerencie suas informações pessoais e segurança.</p>
        </div>

        <div className={`${pageInset} flex flex-col gap-6`}>
          <Card className="finance-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <User className="size-5 text-slate-600" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <Avatar className="size-24 rounded-full">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback className="rounded-full bg-gradient-to-br from-orange-400 via-violet-500 to-rose-400 text-2xl font-semibold text-white">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="max-w-[140px] text-center text-xs text-slate-500">
                    Clique na imagem para enviar uma foto (JPG, PNG)
                  </p>
                </div>

                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex-1"
                      />
                      <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Verificado
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phone">Telefone celular</Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      value={phone}
                      onChange={e => setPhone(formatPhone(e.target.value))}
                      placeholder="(31) 99999-9999"
                    />
                  </div>
                  <div className="sm:col-span-2 sm:flex sm:justify-end">
                    <Button
                      onClick={() => void handleSave()}
                      isLoading={isSaving}
                      className="w-full bg-slate-900 hover:bg-slate-800 sm:w-auto"
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="finance-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Shield className="size-5 text-slate-600" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">Senha</p>
                  <p className="text-sm text-slate-500">
                    Recomendamos usar uma senha forte e única.
                  </p>
                </div>
                <Button variant="outline" className="shrink-0" disabled>
                  Trocar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingErrorState>
  )
}
