import { cva } from "class-variance-authority"
import { useEffect, useReducer, useState } from "react"
import { ImageToolbar } from "@/components/ImageToolbar"
import { IMAGE_OVELAY_INITIAL_STATE, imageOverlayReducer } from "@/hooks/imageOverlayReducer"
import { RESIZE_DIRECTIONS, useDragAndResize } from "@/hooks/useDragAndResize"
import { processSvgImage } from "@/utils/processSvgImage"

const MAX_Z_INDEX = 2147483647

interface ImageOverlayProps {
  imageData: string | undefined
  onDelete: () => void
}

const fieldsetCva = cva("fixed m-0 box-border select-none border-none p-0", {
  variants: {
    dragging: {
      true: "cursor-grabbing",
      false: "cursor-move",
    },
  },
})
const resizeHandleCva = cva(
  "absolute h-2.5 w-2.5 rounded-sm border border-white bg-blue-500 transition-opacity duration-200",
  {
    variants: {
      direction: {
        top_left: "-top-1.5 -left-1.5 cursor-nwse-resize",
        top: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
        top_right: "-top-1.5 -right-1.5 cursor-nesw-resize",
        right: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize",
        bottom_right: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
        bottom: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
        bottom_left: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
        left: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize",
      },
      visible: {
        true: "opacity-100",
        false: "opacity-0",
      },
    },
  },
)

export function ImageOverlay({ imageData, onDelete }: ImageOverlayProps) {
  const [state, dispatch] = useReducer(imageOverlayReducer, IMAGE_OVELAY_INITIAL_STATE)
  const [isHovered, setIsHovered] = useState(false)

  const processedImageData = processSvgImage(imageData)

  const { isDragging, isResizing, handleDragStart, handleResizeStart } = useDragAndResize({ state, dispatch })

  // Set initial size based on image dimensions
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      dispatch({
        type: "SET_SIZE",
        payload: { width: Math.round(img.naturalWidth), height: Math.round(img.naturalHeight) },
      })
      dispatch({ type: "SET_ASPECT_RATIO", payload: img.naturalWidth / img.naturalHeight })
    }
    img.src = imageData ?? ""
  }, [imageData])

  const showHandles = isHovered || isDragging || !!isResizing

  return (
    <fieldset
      aria-label="Draggable image overlay"
      className={fieldsetCva({ dragging: isDragging })}
      style={{
        left: state.position.x,
        top: state.position.y,
        width: state.isVisibleImage ? state.size.width : undefined,
        height: state.isVisibleImage ? state.size.height : undefined,
        zIndex: MAX_Z_INDEX,
        touchAction: "none",
      }}
      onPointerDown={handleDragStart}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      {state.isVisibleImage && (
        <img
          src={processedImageData}
          alt="overlay"
          className="pointer-events-none block"
          style={{
            opacity: state.opacity / 100,
            width: state.size.width,
            height: state.size.height,
            objectFit: "fill",
          }}
          draggable={false}
        />
      )}
      {/* Toolbar */}
      <ImageToolbar state={state} dispatch={dispatch} onDelete={onDelete} />
      {/* Resize handles */}
      {state.isVisibleImage &&
        RESIZE_DIRECTIONS.map((direction) => (
          <button
            key={direction}
            type="button"
            aria-label={`Resize from ${direction}`}
            className={resizeHandleCva({ direction, visible: showHandles })}
            onPointerDown={handleResizeStart(direction)}
          />
        ))}
    </fieldset>
  )
}
