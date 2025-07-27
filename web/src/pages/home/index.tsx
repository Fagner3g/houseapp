import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Home() {
  return (
    <div className="flex flex-col gap-4   p-4">
      <h1>Home</h1>
      <Input />
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-2xl font-bold mb-4">Button Examples</h2>

        {/* Basic button */}
        <div className="flex gap-2">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>

        {/* Different sizes */}
        <div className="flex items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🔥</Button>
        </div>

        {/* Disabled state */}
        <div className="flex gap-2">
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
        </div>

        {/* Loading state */}
        <div className="flex gap-2">
          <Button disabled>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Loading...
          </Button>
        </div>

        {/* With icons */}
        <div className="flex gap-2">
          <Button>
            <span className="mr-2">📧</span>
            Send Email
          </Button>
          <Button variant="outline">
            Download
            <span className="ml-2">⬇️</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
