import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/(goal)/goals')({
  component: About,
})

function About() {
  return <div>Metas</div>
}
