import { createFileRoute, Outlet } from '@tanstack/react-router'

// Importar versão do package.json raiz do projeto
const version = import.meta.env.VITE_APP_VERSION
export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex min-h-screen w-screen flex-col" style={{ backgroundColor: '#1b1718' }}>
      <div className="flex flex-1 flex-col justify-center">
        <Outlet />
      </div>
      <footer
        className="py-4 w-full text-center justify-center"
        style={{ backgroundColor: '#1b1718' }}
      >
        <p className="text-gray-500">
          @ Copy Right 2025 <span className="text-sm text-gray-400"> - v{version}</span>
        </p>
      </footer>
    </div>
  )
}
