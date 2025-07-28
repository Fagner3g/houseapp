import { createFileRoute } from '@tanstack/react-router'

import { Header } from '@/components/layout/header'

export const Route = createFileRoute('/_app/(goal)/goals')({
  component: About,
})

function About() {
  return (
    <div>
      <Header />
      Metas
    </div>
  )
}
