import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <h1>Navbar</h1>
      <Outlet />
    </div>
  )
}
