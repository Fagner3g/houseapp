import { createFileRoute, Outlet } from '@tanstack/react-router'

// build-time version via env (injected by CI or fallback)
const version = import.meta.env.VITE_APP_VERSION ?? 'dev'
export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-1 h-screen w-screen flex-col bg-gray-900">
      <div className="flex flex-1 flex-col justify-center">
        <Outlet />
      </div>
      <footer className="py-4 bg-black w-full text-center justify-center">
        <p className="text-gray-500">
          @ Copy Right 2025 <span className="text-sm text-gray-400"> - v{version}</span>
        </p>
      </footer>
    </div>
  )
}
