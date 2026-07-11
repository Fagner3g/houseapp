const EXTENSION_MESSAGE_TYPE = 'houseapp:transactions-changed'

export function notifyExtensionTransactionsChanged() {
  if (typeof window === 'undefined') return
  window.postMessage({ type: EXTENSION_MESSAGE_TYPE }, window.location.origin)
}
