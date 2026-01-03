'use client'

import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  triggerElement?: Element | null
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'bottom' | 'top'
  offset?: number
}

/**
 * Portal Component - Renders completely outside React tree to document.body
 *
 * This bypasses ALL stacking contexts including backdrop-blur and z-index layers.
 * Essential for dropdowns that need to appear above backdrop-blur card containers.
 */
export default function Portal({
  children,
  triggerElement,
  placement = 'bottom-start',
  offset = 8
}: PortalProps) {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useLayoutEffect(() => {
    if (mounted && triggerElement && portalRef.current) {
      const updatePosition = () => {
        const triggerRect = triggerElement.getBoundingClientRect()
        const portalRect = portalRef.current!.getBoundingClientRect()

        let x = 0
        let y = 0

        switch (placement) {
          case 'bottom-start':
            x = triggerRect.left
            y = triggerRect.bottom + offset
            break
          case 'bottom-end':
            x = triggerRect.right - portalRect.width
            y = triggerRect.bottom + offset
            break
          case 'bottom':
            x = triggerRect.left + (triggerRect.width / 2) - (portalRect.width / 2)
            y = triggerRect.bottom + offset
            break
          case 'top-start':
            x = triggerRect.left
            y = triggerRect.top - portalRect.height - offset
            break
          case 'top-end':
            x = triggerRect.right - portalRect.width
            y = triggerRect.top - portalRect.height - offset
            break
          case 'top':
            x = triggerRect.left + (triggerRect.width / 2) - (portalRect.width / 2)
            y = triggerRect.top - portalRect.height - offset
            break
        }

        // Keep within viewport bounds
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        x = Math.max(8, Math.min(x, viewportWidth - portalRect.width - 8))
        y = Math.max(8, Math.min(y, viewportHeight - portalRect.height - 8))

        setPosition({ x, y })
      }

      updatePosition()

      const handleResize = () => updatePosition()
      const handleScroll = () => updatePosition()

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [mounted, triggerElement, placement, offset])

  if (!mounted) {
    return null
  }

  const portalContent = (
    <div
      ref={portalRef}
      style={{
        position: 'fixed',
        left: triggerElement ? position.x : undefined,
        top: triggerElement ? position.y : undefined,
        zIndex: 999999,
        pointerEvents: 'auto'
      }}
    >
      {children}
    </div>
  )

  // Always render to document.body to escape ALL stacking contexts
  return createPortal(portalContent, document.body)
}