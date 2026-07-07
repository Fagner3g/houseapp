import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/accounts')({
  component: AccountsLayout,
})

function AccountsLayout() {
  return <Outlet />
}
