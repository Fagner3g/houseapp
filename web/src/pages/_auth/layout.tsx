import { createFileRoute, Outlet } from '@tanstack/react-router'

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
        <p>@ Copy Right 2025</p>
      </footer>
    </div>
  )
}
