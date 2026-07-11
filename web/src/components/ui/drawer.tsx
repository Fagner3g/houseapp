import type * as React from 'react'
import { useEffect, useRef } from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

import {
  isPortaledOverlayOpen,
  shouldKeepDrawerOpenOnOutsideEvent,
} from '@/components/ui/drawer-portal-layers'
import {
  stackyDrawerContentStackedOuter,
  stackyDrawerInnerShell,
  stackyDrawerInnerShellStacked,
  stackyDrawerOverlayNested,
} from '@/lib/ui-classes'
import { cn } from '@/lib/utils'

function Drawer({
  dismissible = false,
  modal = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root data-slot="drawer" dismissible={dismissible} modal={modal} {...props} />
  )
}

function DrawerNestedRoot({
  dismissible = false,
  modal = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.NestedRoot>) {
  return (
    <DrawerPrimitive.NestedRoot
      data-slot="drawer-nested"
      dismissible={dismissible}
      modal={modal}
      {...props}
    />
  )
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  dismissible = true,
  animated = true,
  onDismiss,
  ...props
}: React.ComponentProps<'div'> & {
  dismissible?: boolean
  animated?: boolean
  onDismiss?: () => void
}) {
  const classStr = typeof className === 'string' ? className : ''
  const hasZIndex = /\bz-/.test(classStr)
  const hasCustomPosition = /\b(inset-y-0|right-0|left-auto|max-w-)/.test(classStr)
  const hasCustomBg = /\bbg-/.test(classStr)
  const nestedOverlayOpenOnPointerDownRef = useRef(false)

  useEffect(() => {
    if (!onDismiss) return

    const captureNestedOverlayState = () => {
      nestedOverlayOpenOnPointerDownRef.current = isPortaledOverlayOpen()
    }

    document.addEventListener('pointerdown', captureNestedOverlayState, true)
    return () => document.removeEventListener('pointerdown', captureNestedOverlayState, true)
  }, [onDismiss])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dismissible || event.button !== 0) return
    if (nestedOverlayOpenOnPointerDownRef.current) return
    onDismiss?.()
  }

  const overlay = (
    <div
      data-slot="drawer-overlay"
      className={cn(
        'fixed select-none duration-[400ms]',
        animated && 'animate-in fade-in-0',
        !hasCustomBg && 'bg-black/45',
        !hasCustomPosition && 'inset-0',
        !hasZIndex && 'z-50',
        dismissible ? 'pointer-events-auto' : 'pointer-events-none',
        className
      )}
      aria-hidden="true"
      onPointerDown={onDismiss ? handlePointerDown : undefined}
      {...props}
    />
  )

  if (onDismiss) {
    return overlay
  }

  return <DrawerClose asChild>{overlay}</DrawerClose>
}

function DrawerContent({
  className,
  children,
  hideOverlay = false,
  overlayClassName,
  overlayDismissible = true,
  overlayAnimated = true,
  onOverlayDismiss,
  stackedOverlayClassName,
  onStackedOverlayDismiss,
  stackable = false,
  stacked = false,
  onFocusOutside,
  onPointerDownOutside,
  onInteractOutside,
  style,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  hideOverlay?: boolean
  overlayClassName?: string
  overlayDismissible?: boolean
  overlayAnimated?: boolean
  onOverlayDismiss?: () => void
  /** Full-screen dim layer rendered in this portal above the back drawer when stacked. */
  stackedOverlayClassName?: string
  onStackedOverlayDismiss?: () => void
  /** Enables inner-shell animation when another drawer opens on top. */
  stackable?: boolean
  stacked?: boolean
}) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      {!hideOverlay && (
        <DrawerOverlay
          className={overlayClassName}
          dismissible={overlayDismissible}
          animated={overlayAnimated}
          onDismiss={onOverlayDismiss}
        />
      )}
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        data-stacked={stacked ? 'true' : undefined}
        className={cn(
          'group/drawer-content bg-background fixed flex h-auto flex-col',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t',
          'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:max-w-md data-[vaul-drawer-direction=right]:border-l',
          'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:max-w-md data-[vaul-drawer-direction=left]:border-r',
          className,
          stackable && stacked && stackyDrawerContentStackedOuter
        )}
        aria-describedby={undefined}
        style={{ pointerEvents: 'auto', ...style }}
        onFocusOutside={event => {
          if (shouldKeepDrawerOpenOnOutsideEvent(event)) {
            event.preventDefault()
          }
          onFocusOutside?.(event)
        }}
        onPointerDownOutside={event => {
          if (shouldKeepDrawerOpenOnOutsideEvent(event)) {
            event.preventDefault()
          }
          onPointerDownOutside?.(event)
        }}
        onInteractOutside={event => {
          if (shouldKeepDrawerOpenOnOutsideEvent(event)) {
            event.preventDefault()
          }
          onInteractOutside?.(event)
        }}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {stackable ? (
          <div
            className={cn(
              stackyDrawerInnerShell,
              stacked && stackyDrawerInnerShellStacked
            )}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </DrawerPrimitive.Content>
      {stackable && stacked && (
        <button
          type="button"
          aria-label="Fechar painel sobreposto"
          className={cn(
            stackyDrawerOverlayNested,
            stackedOverlayClassName,
            'cursor-default border-0 p-0'
          )}
          onClick={onStackedOverlayDismiss}
        />
      )}
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex shrink-0 flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center group-data-[vaul-drawer-direction=left]/drawer-content:flex-row group-data-[vaul-drawer-direction=left]/drawer-content:items-center group-data-[vaul-drawer-direction=left]/drawer-content:justify-between group-data-[vaul-drawer-direction=right]/drawer-content:flex-row group-data-[vaul-drawer-direction=right]/drawer-content:items-center group-data-[vaul-drawer-direction=right]/drawer-content:justify-between md:gap-1.5 md:text-left',
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-xl font-semibold text-gray-900', className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerNestedRoot,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
