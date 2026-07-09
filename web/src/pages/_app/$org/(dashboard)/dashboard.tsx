import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/(dashboard)/dashboard')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/$org',
      params: { org: params.org },
    })
  },
})
