import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/settings/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/$org/settings/categories',
      params: { org: params.org },
    })
  },
})
