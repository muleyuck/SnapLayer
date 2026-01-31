import { useCallback, useEffect, useRef, useState } from "react"
import type { ImageOverlayAction, ImageOverlayState } from "@/hooks/imageOverlayReducer"

const RESIZE_DIRECTIONS = [
  "top_left",
  "top",
  "top_right",
  "right",
  "bottom_right",
  "bottom",
  "bottom_left",
  "left",
] as const

export type ResizeDirection = (typeof RESIZE_DIRECTIONS)[number]
export { RESIZE_DIRECTIONS }

const NO_DRAGGABLE_ELEMENTS = ["INPUT", "BUTTON", "SPAN"]

interface UseDragAndResizeOptions {
  state: ImageOverlayState
  dispatch: React.ActionDispatch<[action: ImageOverlayAction]>
}

export function useDragAndResize({ state, dispatch }: UseDragAndResizeOptions) {
  const { position, size, aspectRatio, lockAspectRatio } = state

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<ResizeDirection | null>(null)

  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const resizeStartRef = useRef<{
    x: number
    y: number
    width: number
    height: number
    posX: number
    posY: number
  } | null>(null)

  const handleDragStart = (e: React.PointerEvent) => {
    // Blur active input when clicking outside of it for natural focus behavior
    if (!(e.target instanceof HTMLInputElement)) {
      ;(document.activeElement as HTMLElement)?.blur?.()
    }
    const target = e.target as HTMLElement
    if (NO_DRAGGABLE_ELEMENTS.includes(target.tagName)) {
      return
    }
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
    e.preventDefault()
  }

  const handleResizeStart = (direction: ResizeDirection) => (e: React.PointerEvent) => {
    setIsResizing(direction)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    }
    e.preventDefault()
    e.stopPropagation()
  }

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (isDragging && dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y
        dispatch({
          type: "SET_POSITION",
          payload: { x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy },
        })
      }

      if (!isResizing || !resizeStartRef.current) {
        return
      }

      const dx = e.clientX - resizeStartRef.current.x
      const dy = e.clientY - resizeStartRef.current.y
      const { width: initW, height: initH, posX: initX, posY: initY } = resizeStartRef.current

      const isRight = isResizing.includes("right")
      const isLeft = isResizing.includes("left")
      const isTop = isResizing.includes("top")
      const isBottom = isResizing.includes("bottom")
      const isVerticalOnly = (isTop || isBottom) && !isRight && !isLeft

      let newWidth = initW
      let newHeight = initH
      let newX = initX
      let newY = initY

      if (isRight) {
        newWidth = Math.max(10, initW + dx)
      } else if (isLeft) {
        newWidth = Math.max(10, initW - dx)
        newX = initX + (initW - newWidth)
      }

      if (isBottom) {
        newHeight = Math.max(10, initH + dy)
      } else if (isTop) {
        newHeight = Math.max(10, initH - dy)
        newY = initY + (initH - newHeight)
      }

      if (lockAspectRatio) {
        if (isVerticalOnly) {
          newWidth = Math.round(newHeight * aspectRatio)
        } else {
          newHeight = Math.round(newWidth / aspectRatio)
          if (isTop) {
            newY = initY + (initH - newHeight)
          }
        }
      }

      dispatch({ type: "SET_SIZE", payload: { width: Math.max(10, newWidth), height: Math.max(10, newHeight) } })
      dispatch({ type: "SET_POSITION", payload: { x: newX, y: newY } })
    },
    [isDragging, isResizing, aspectRatio, lockAspectRatio, dispatch],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(null)
  }, [])

  useEffect(() => {
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)

    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  return {
    isDragging,
    isResizing,
    handleDragStart,
    handleResizeStart,
  }
}
