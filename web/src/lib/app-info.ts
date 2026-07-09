export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '0.0.0'
}

export function getAppEnvironmentLabel(): string {
  if (import.meta.env.DEV) {
    return 'Desenvolvimento'
  }

  const apiHost = import.meta.env.VITE_API_HOST ?? ''
  if (apiHost.includes('homolog')) {
    return 'Homologação'
  }

  return 'Produção'
}
