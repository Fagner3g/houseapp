const PORTAL_LAYER_SELECTOR = [
  '[data-slot="select-content"]',
  '[data-slot="select-trigger"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="popover-trigger"]',
  '[data-slot="dialog-content"]',
  '[data-slot="dialog-overlay"]',
  '[data-radix-popper-content-wrapper]',
].join(', ')

const OPEN_PORTAL_LAYER_SELECTOR = [
  '[data-slot="select-content"][data-state="open"]',
  '[data-slot="popover-content"][data-state="open"]',
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-slot="dialog-content"][data-state="open"]',
].join(', ')

function isInteractivePortaledLayer(node: Element) {
  if (!(node instanceof HTMLElement)) return false
  // Background dialogs (e.g. analytics group) stay mounted under the drawer with
  // pointer-events: none — they must not block overlay dismiss.
  return getComputedStyle(node).pointerEvents !== 'none'
}

export function isPortaledOverlayOpen() {
  if (typeof document === 'undefined') return false
  const layers = document.querySelectorAll(OPEN_PORTAL_LAYER_SELECTOR)
  for (const layer of layers) {
    if (isInteractivePortaledLayer(layer)) return true
  }
  return false
}

export function isPortaledOverlayTarget(target: EventTarget | null | undefined) {
  if (!(target instanceof Element)) return false
  const layer = target.closest(PORTAL_LAYER_SELECTOR)
  return layer != null && isInteractivePortaledLayer(layer)
}

export function shouldKeepDrawerOpenOnOutsideEvent(
  event: { target: EventTarget | null; detail?: { originalEvent?: Event } }
) {
  if (isPortaledOverlayTarget(event.target)) return true

  const originalTarget = event.detail?.originalEvent?.target
  return isPortaledOverlayTarget(originalTarget)
}
