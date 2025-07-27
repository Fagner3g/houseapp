import { ModeToggle } from '@/components/mode-toggle'
import { Input } from '@/components/ui/input'

export function Home() {
  return (
    <div className="flex flex-col gap-4   p-4">
      <h1>Home</h1>
      <Input />
      <ModeToggle />
    </div>
  )
}
