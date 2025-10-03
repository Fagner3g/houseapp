import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/(settings)')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
