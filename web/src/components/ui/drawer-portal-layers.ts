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

export function isPortaledOverlayOpen() {
  if (typeof document === 'undefined') return false
  return Boolean(document.querySelector(OPEN_PORTAL_LAYER_SELECTOR))
}

export function isPortaledOverlayTarget(target: EventTarget | null | undefined) {
  return target instanceof Element && Boolean(target.closest(PORTAL_LAYER_SELECTOR))
}

export function shouldKeepDrawerOpenOnOutsideEvent(
  event: { target: EventTarget | null; detail?: { originalEvent?: Event } }
) {
  if (isPortaledOverlayTarget(event.target)) return true

  const originalTarget = event.detail?.originalEvent?.target
  return isPortaledOverlayTarget(originalTarget)
}
