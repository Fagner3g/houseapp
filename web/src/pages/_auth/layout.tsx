import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { getAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  beforeLoad: async () => {
    const token = getAuthToken()
    if (token) {
      throw redirect({ to: '/$org/goals', params: { org: 'my-house' } })
    }
  },
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
