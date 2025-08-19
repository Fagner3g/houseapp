import { zodResolver } from '@hookform/resolvers/zod'
import { IconPlus } from '@tabler/icons-react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useCreatePolicy } from '@/http/notifications'

const schema = z
  .object({
    scope: z.enum(['transaction', 'goal']),
    event: z.enum(['due_soon', 'overdue']),
    days_before: z.coerce.number().int().min(0).optional().nullable(),
    days_overdue: z.coerce.number().int().min(0).optional().nullable(),
    repeat_every_minutes: z.coerce.number().int().min(0).optional().nullable(),
    max_occurrences: z.coerce.number().int().min(0).optional().nullable(),
    channels: z.string().default('email'),
    active: z.boolean().default(true),
  })
  .refine(
    data =>
      (data.event === 'due_soon' && data.days_before !== null && data.days_overdue == null) ||
      (data.event === 'overdue' && data.days_overdue !== null && data.days_before == null),
    { message: 'Defina apenas o campo correspondente ao evento.' }
  )

export type PolicyFormSchema = z.infer<typeof schema>

export function CreatePolicyDialog() {
  const { slug } = useActiveOrganization()
  const form = useForm<PolicyFormSchema>({
    resolver: zodResolver(schema) as Resolver<PolicyFormSchema>,
    defaultValues: {
      scope: 'transaction',
      event: 'due_soon',
      channels: 'email',
      active: true,
    },
  })

  const { mutateAsync: createPolicy } = useCreatePolicy()

  async function onSubmit(data: PolicyFormSchema) {
    try {
      await createPolicy({ slug, data })
      toast.success('Policy criada!')
    } catch (err) {
      toast.error('Erro ao criar policy')
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IconPlus /> Nova policy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar policy</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escopo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="transaction">Transação</SelectItem>
                      <SelectItem value="goal">Meta</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="due_soon">A vencer</SelectItem>
                      <SelectItem value="overdue">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {form.watch('event') === 'due_soon' ? (
              <FormField
                control={form.control}
                name="days_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias antes</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="days_overdue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias de atraso</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="repeat_every_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repetir a cada (min)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_occurrences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. ocorrências</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canais</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Ativa</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Salvar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
