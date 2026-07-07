import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/settings/accounts')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/$org/accounts',
      params: { org: params.org },
    })
  },
})
