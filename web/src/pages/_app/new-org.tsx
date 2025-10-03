import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { ModalNewOrganization } from '@/components/modal-new-organization'

export const Route = createFileRoute('/_app/new-org')({ component: NewOrgPage })

function NewOrgPage() {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <ModalNewOrganization open={open} onOpenChange={setOpen} />
    </div>
  )
}
