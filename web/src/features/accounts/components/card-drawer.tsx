import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getListCardsQueryKey, useCreateCard, useListUsersByOrg } from '@/api/generated/api'
import type { CreateCardBodyType } from '@/api/generated/model/createCardBodyType'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatOrgUserLabel } from '@/lib/org-users'
import { useAuthStore } from '@/stores/auth'
import { useDrawerStore } from '@/stores/drawers'
import {
  stackyDrawerContentNested,
  stackyDrawerOverlay,
  stackyDrawerCloseButton,
  stackyDrawerFooter,
  stackyDrawerHeader,
  stackyDrawerTitle,
} from '@/lib/ui-classes'

import { CARD_BRANDS } from '@/features/accounts/constants'

const cardSchema = z.object({
  label: z.string().min(1, 'Apelido obrigatório'),
  type: z.enum(['physical', 'virtual', 'additional']),
  lastFourDigits: z.string().length(4).optional().or(z.literal('')),
  holderName: z.string().optional(),
  userId: z.string().optional(),
  brand: z.string().optional(),
})

type CardFormValues = z.infer<typeof cardSchema>

export function CardDrawer({ nested = false }: { nested?: boolean }) {
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const open = useDrawerStore(s => s.cardDrawerOpen)
  const transactionOpen = useDrawerStore(s => s.transactionDrawerOpen)
  const accountId = useDrawerStore(s => s.cardDrawerAccountId)
  const close = useDrawerStore(s => s.closeCardDrawer)
  const queryClient = useQueryClient()
  const { mutateAsync: createCard, isPending } = useCreateCard()
  const { data: membersData } = useListUsersByOrg(slug, { query: { enabled: !!slug && open } })
  const members = membersData?.users ?? []

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      label: '',
      type: 'physical',
      lastFourDigits: '',
      holderName: '',
      userId: '',
      brand: 'visa',
    },
  })

  const cardType = form.watch('type')

  useEffect(() => {
    if (open) {
      form.reset({
        label: '',
        type: 'physical',
        lastFourDigits: '',
        holderName: '',
        userId: '',
        brand: 'visa',
      })
    }
  }, [open, form])

  useEffect(() => {
    if (cardType !== 'additional') {
      form.setValue('userId', '')
    }
  }, [cardType, form])

  const onSubmit = async (values: CardFormValues) => {
    if (!slug || !accountId) return
    try {
      await createCard({
        slug,
        accountId,
        data: {
          label: values.label,
          type: values.type as CreateCardBodyType,
          lastFourDigits: values.lastFourDigits || null,
          holderName: values.holderName || null,
          userId: values.type === 'additional' && values.userId ? values.userId : null,
          brand: values.brand || null,
        },
      })
      queryClient.invalidateQueries({ queryKey: getListCardsQueryKey(slug, accountId) })
      toast.success('Cartão criado')
      close()
    } catch {
      toast.error('Erro ao criar cartão')
    }
  }

  if (nested && !transactionOpen) return null
  if (!nested && transactionOpen) return null

  const panel = (
    <DrawerContent
      className={stackyDrawerContentNested}
      hideOverlay={nested}
      overlayClassName={stackyDrawerOverlay}
      onOverlayDismiss={close}
    >
      <DrawerHeader className={stackyDrawerHeader}>
        <DrawerTitle className={stackyDrawerTitle}>Adicionar cartão</DrawerTitle>
        <button
          type="button"
          aria-label="Fechar"
          className={stackyDrawerCloseButton}
          onClick={close}
        >
          <X className="size-5" />
        </button>
      </DrawerHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <p className="text-sm text-slate-600">
              Cartão físico, virtual ou adicional vinculado a esta fatura. Limite e vencimento
              ficam na conta principal.
            </p>

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apelido do cartão *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Virtual viagem, Cartão da Ana..." {...field} />
                  </FormControl>
                  <FormDescription>Identifica qual plástico foi usado na compra.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="physical">Físico</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="additional">Adicional</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastFourDigits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final do cartão</FormLabel>
                  <FormControl>
                    <Input placeholder="1234" maxLength={4} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="holderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome no cartão</FormLabel>
                  <FormControl>
                    <Input placeholder="Titular" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {cardType === 'additional' && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membro dono do cartão</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione quem usa este cartão" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {formatOrgUserLabel(member, currentUserId)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Compras neste cartão podem sugerir split automático na importação da fatura.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bandeira</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CARD_BRANDS.map(b => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <DrawerFooter className={stackyDrawerFooter}>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                Adicionar cartão
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </Form>
    </DrawerContent>
  )

  if (nested) {
    return (
      <DrawerNestedRoot open={open} onOpenChange={v => !v && close()} direction="right">
        {panel}
      </DrawerNestedRoot>
    )
  }

  return (
    <Drawer open={open} onOpenChange={v => !v && close()} direction="right">
      {panel}
    </Drawer>
  )
}
