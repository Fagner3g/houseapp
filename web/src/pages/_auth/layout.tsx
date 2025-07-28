import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="bg-gray-100 h-screen flex flex-col items-center justify-center gap-4 p-4 text-center ">
      <div>
        <Outlet />
      </div>
      <p>@ Copy Right 2025</p>
    </div>
  )
}
