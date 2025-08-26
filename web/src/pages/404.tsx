import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <h1 className="text-9xl text-red-500">404</h1>
      <p>Página não encontrada, volte para a página de login</p>
      <Link to="/sign-in">Login</Link>
    </div>
  )
}
