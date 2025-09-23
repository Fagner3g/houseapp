import { useEffect, useState } from 'react'

/**
 * Hook para detectar quando o teclado virtual está ativo em dispositivos móveis
 * Baseado na diferença entre a altura da viewport e a altura da window
 */
export function useVirtualKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      // Em dispositivos móveis, quando o teclado virtual aparece,
      // a diferença entre window.innerHeight e visualViewport.height aumenta
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.innerHeight
      const heightDifference = windowHeight - viewportHeight

      // Considera o teclado aberto se a diferença for maior que 100px
      const keyboardOpen = heightDifference > 100
      setIsKeyboardOpen(keyboardOpen)
      setKeyboardHeight(keyboardOpen ? heightDifference : 0)
    }

    // Usa visualViewport se disponível (mais preciso)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      return () => window.visualViewport?.removeEventListener('resize', handleResize)
    } else {
      // Fallback para window resize
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { isKeyboardOpen, keyboardHeight }
}
