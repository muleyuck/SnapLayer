import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ImageToolbar } from "@/components/ImageToolbar"
import type { Position, Size } from "@/types/ImageRect"

interface ImageOverlayProps {
  imageData: string | undefined
  onDelete: () => void
}

type ResizeDirection = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

const RESIZE_DIRECTIONS: { direction: ResizeDirection; label: string; className: string }[] = [
  { direction: "nw", label: "Resize from top-left", className: "-top-1.5 -left-1.5 cursor-nwse-resize" },
  { direction: "n", label: "Resize from top", className: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { direction: "ne", label: "Resize from top-right", className: "-top-1.5 -right-1.5 cursor-nesw-resize" },
  { direction: "e", label: "Resize from right", className: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize" },
  { direction: "se", label: "Resize from bottom-right", className: "-right-1.5 -bottom-1.5 cursor-nwse-resize" },
  { direction: "s", label: "Resize from bottom", className: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { direction: "sw", label: "Resize from bottom-left", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
  { direction: "w", label: "Resize from left", className: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize" },
]

export function ImageOverlay({ imageData, onDelete }: ImageOverlayProps) {
  const [position, setPosition] = useState<Position>({ x: 100, y: 100 })
  const [size, setSize] = useState<Size>({ width: 200, height: 200 })
  const [aspectRatio, setAspectRatio] = useState(1)
  const [lockAspectRatio, setLockAspectRatio] = useState(true)
  const [opacity, setOpacity] = useState(100)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<ResizeDirection | null>(null)
  const [isVisibleImage, setIsVisibleImage] = useState(true)

  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const resizeStartRef = useRef<{
    x: number
    y: number
    width: number
    height: number
    posX: number
    posY: number
  } | null>(null)

  // Process SVG to always set preserveAspectRatio="none" so it stretches with container
  const processedImageData = useMemo(() => {
    if (!imageData) return imageData
    if (!imageData.startsWith("data:image/svg+xml")) return imageData

    try {
      let svgContent: string
      if (imageData.includes("base64,")) {
        const base64 = imageData.split("base64,")[1]
        svgContent = atob(base64)
      } else {
        const encoded = imageData.split(",")[1]
        svgContent = decodeURIComponent(encoded)
      }

      if (svgContent.includes("preserveAspectRatio")) {
        svgContent = svgContent.replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="none"')
      } else {
        svgContent = svgContent.replace(/<svg/, '<svg preserveAspectRatio="none"')
      }

      return `data:image/svg+xml;base64,${btoa(svgContent)}`
    } catch {
      return imageData
    }
  }, [imageData])

  // Set initial size based on image dimensions
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      setAspectRatio(ratio)
      setSize({
        width: Math.round(img.naturalWidth),
        height: Math.round(img.naturalHeight),
      })
    }
    img.src = imageData ?? ""
  }, [imageData])

  // Drag handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.tagName === "SPAN" || target.dataset.resize) {
        return
      }
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
      e.preventDefault()
    },
    [position],
  )

  // Resize handlers
  const handleResizePointerDown = useCallback(
    (direction: ResizeDirection) => (e: React.PointerEvent) => {
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
    },
    [size, position],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (isDragging && dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y
        setPosition({
          x: dragStartRef.current.posX + dx,
          y: dragStartRef.current.posY + dy,
        })
      }

      if (isResizing && resizeStartRef.current) {
        const dx = e.clientX - resizeStartRef.current.x
        const dy = e.clientY - resizeStartRef.current.y
        const { width: initW, height: initH, posX: initX, posY: initY } = resizeStartRef.current

        let newWidth = initW
        let newHeight = initH
        let newX = initX
        let newY = initY

        const hasHorizontal = isResizing.includes("e") || isResizing.includes("w")
        const hasVertical = isResizing.includes("n") || isResizing.includes("s")

        if (lockAspectRatio) {
          // Lock mode: maintain aspect ratio
          if (hasHorizontal && !hasVertical) {
            if (isResizing.includes("e")) {
              newWidth = Math.max(10, initW + dx)
            } else {
              newWidth = Math.max(10, initW - dx)
              newX = initX + (initW - newWidth)
            }
            newHeight = Math.round(newWidth / aspectRatio)
          } else if (hasVertical && !hasHorizontal) {
            if (isResizing.includes("s")) {
              newHeight = Math.max(10, initH + dy)
            } else {
              newHeight = Math.max(10, initH - dy)
              newY = initY + (initH - newHeight)
            }
            newWidth = Math.round(newHeight * aspectRatio)
          } else {
            if (isResizing.includes("e")) {
              newWidth = Math.max(10, initW + dx)
            } else if (isResizing.includes("w")) {
              newWidth = Math.max(10, initW - dx)
              newX = initX + (initW - newWidth)
            }
            newHeight = Math.round(newWidth / aspectRatio)
            if (isResizing.includes("n")) {
              newY = initY + (initH - newHeight)
            }
          }
        } else {
          // Unlock mode: free resize
          if (isResizing.includes("e")) {
            newWidth = Math.max(10, initW + dx)
          } else if (isResizing.includes("w")) {
            newWidth = Math.max(10, initW - dx)
            newX = initX + (initW - newWidth)
          }
          if (isResizing.includes("s")) {
            newHeight = Math.max(10, initH + dy)
          } else if (isResizing.includes("n")) {
            newHeight = Math.max(10, initH - dy)
            newY = initY + (initH - newHeight)
          }
        }

        setSize({ width: Math.max(10, newWidth), height: Math.max(10, newHeight) })
        setPosition({ x: newX, y: newY })
      }
    },
    [isResizing, isDragging, aspectRatio, lockAspectRatio],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(null)
  }, [])

  // Global mouse/touch move/up handlers
  useEffect(() => {
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)

    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const showControls = isHovered || isDragging || isResizing

  const resizeHandleBase =
    "absolute h-2.5 w-2.5 rounded-sm border border-white bg-blue-500 transition-opacity duration-200"

  return (
    <fieldset
      aria-label="Draggable image overlay"
      className={`fixed m-0 box-border select-none border-none p-0 ${isDragging ? "cursor-grabbing" : "cursor-move"}`}
      style={{
        left: position.x,
        top: position.y,
        width: isVisibleImage ? size.width : undefined,
        height: isVisibleImage ? size.height : undefined,
        zIndex: 2147483647,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      {isVisibleImage && (
        <img
          src={processedImageData}
          alt="overlay"
          className="pointer-events-none block"
          style={{
            opacity: opacity / 100,
            width: size.width,
            height: size.height,
            objectFit: "fill",
          }}
          draggable={false}
        />
      )}
      {/* Toolbar */}
      <ImageToolbar
        size={size}
        setSize={setSize}
        opacity={opacity}
        setOpacity={setOpacity}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        lockAspectRatio={lockAspectRatio}
        setLockAspectRatio={setLockAspectRatio}
        setPosition={setPosition}
        isVisibleImage={isVisibleImage}
        setIsVisibleImage={setIsVisibleImage}
        onDelete={onDelete}
      />
      {/* Resize handles */}
      {isVisibleImage &&
        RESIZE_DIRECTIONS.map(({ direction, label, className }) => (
          <button
            key={direction}
            type="button"
            data-resize={direction}
            aria-label={label}
            className={`${resizeHandleBase} ${className} ${showControls ? "opacity-100" : "opacity-0"}`}
            onPointerDown={handleResizePointerDown(direction)}
          />
        ))}
    </fieldset>
  )
}
