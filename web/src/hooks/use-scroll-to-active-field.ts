import { useEffect, useRef } from 'react'

/**
 * Hook para fazer scroll automático para o campo ativo quando o teclado virtual aparece
 */
export function useScrollToActiveField(isKeyboardOpen: boolean) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isKeyboardOpen || !scrollContainerRef.current) return

    // Pequeno delay para garantir que o teclado já apareceu
    const timeoutId = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) return

      // Encontra o campo ativo (focado)
      const activeElement = document.activeElement as HTMLElement
      if (!activeElement || !container.contains(activeElement)) return

      // Calcula a posição do elemento ativo em relação ao container
      const containerRect = container.getBoundingClientRect()
      const elementRect = activeElement.getBoundingClientRect()

      // Verifica se o elemento está visível
      const isVisible =
        elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom

      if (!isVisible) {
        // Faz scroll para o elemento ativo
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }
    }, 300) // 300ms de delay para o teclado aparecer

    return () => clearTimeout(timeoutId)
  }, [isKeyboardOpen])

  return scrollContainerRef
}
