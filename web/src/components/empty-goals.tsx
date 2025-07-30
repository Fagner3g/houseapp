import { Plus } from 'lucide-react'

import rocketLaunchIllustration from '../assets/illustration_lets-start.svg'
import logo from '../assets/logo.svg'
import { Button } from './ui/button'
import { DialogTrigger } from './ui/dialog'

export function EmptyGoals() {
  return (
    <main className="h-screen flex flex-col items-center justify-center gap-8">
      <img src={logo} alt="in.orbit" />

      <img
        src={rocketLaunchIllustration}
        alt="Ilustração de uma mulher controlando um lançamento de um foguete através de um controle remoto"
      />

      <p className="text-zinc-300 leading-relaxed max-w-80 text-center">
        Você ainda não cadastrou nenhuma meta, que tal cadastrar uma agora mesmo?
      </p>

      <DialogTrigger>
        <Button>
          <Plus className="size-4" />
          Cadastrar meta
        </Button>
      </DialogTrigger>
    </main>
  )
}
