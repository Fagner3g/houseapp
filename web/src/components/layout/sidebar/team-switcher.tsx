import { ChevronsUpDown, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'

import { useListOrganizations } from '@/api/generated/api'
import { ModalEditOrganization } from '@/components/modal-edit-organization'
import { ModalNewOrganization } from '@/components/modal-new-organization'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

export function TeamSwitcher() {
  const { isMobile, setOpenMobile } = useSidebar()
  const { data } = useListOrganizations()
  const { slug, setOrganization } = useActiveOrganization()
  const [openEdit, setOpenEdit] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)
  const [openSelector, setOpenSelector] = useState(false)
  const teams = (data?.organizations ?? []).map(org => ({
    id: org.slug,
    name: org.name,
  }))

  const activeTeam = teams.find(t => t.id === slug) ?? teams[0]

  if (!activeTeam) {
    return null
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={openSelector} onOpenChange={setOpenSelector} modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                type="button"
                className="h-10 rounded-lg border border-slate-200/80 bg-white/80 px-3 hover:bg-white data-[state=open]:bg-white group-data-[collapsible=icon]:hidden"
                onClick={() => setOpenSelector(true)}
              >
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Organização
                  </span>
                  <span className="truncate font-semibold text-slate-900">{activeTeam.name}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-slate-400" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
              collisionPadding={8}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizações
              </DropdownMenuLabel>
              {teams.map(team => (
                <DropdownMenuItem
                  key={team.id}
                  onSelect={() => {
                    setOrganization(team.id)
                    setOpenSelector(false)
                    if (isMobile) setOpenMobile(false)
                  }}
                  className={cn(
                    'rounded-lg',
                    team.id === activeTeam.id && 'bg-slate-100 font-medium'
                  )}
                >
                  {team.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg" onClick={() => setOpenCreate(true)}>
                <Plus className="size-4" />
                Adicionar organização
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onClick={() => setOpenEdit(true)}>
                <Settings2 className="size-4" />
                Configurar organização
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ModalEditOrganization
        open={openEdit}
        onOpenChange={setOpenEdit}
        orgSlug={activeTeam.id}
        currentName={activeTeam.name}
      />
      <ModalNewOrganization open={openCreate} onOpenChange={setOpenCreate} />
    </>
  )
}
