import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { NewUserDialog } from '@/features/settings/components/new-user-dialog'

export function ModalNewUser() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Usuário
      </Button>
      <NewUserDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
