import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/accounts/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/$org/accounts',
      params: { org: params.org },
      search: {
        accountId: params.id,
        view: 'settings',
        // kind resolved by hub from account type
      },
    })
  },
})
