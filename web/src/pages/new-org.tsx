import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { useListOrganizations } from '@/api/generated/api'
import { ModalNewOrganization } from '@/components/modal-new-organization'

export const Route = createFileRoute('/new-org')({
  component: NewOrgPage,
})

function NewOrgPage() {
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()
  const { data } = useListOrganizations()

  useEffect(() => {
    const orgs = data?.organizations ?? []
    if (orgs.length > 0) {
      // Usuário já possui organização; redirecionar e não mostrar modal
      navigate({ to: '/$org/dashboard', params: { org: orgs[0].slug } })
    }
  }, [data, navigate])

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <ModalNewOrganization open={open} onOpenChange={setOpen} />
    </div>
  )
}
