import { cva } from "class-variance-authority"
import { useCallback, useReducer, useRef, useState } from "react"
import { ImageToolbar } from "@/components/ImageToolbar"
import { LayerContent } from "@/components/LayerContent"
import { type ImageOverlayState, imageOverlayReducer } from "@/hooks/imageOverlayReducer"
import { RESIZE_DIRECTIONS, useDragAndResize } from "@/hooks/useDragAndResize"
import { LAYER_OPTIONS, type LayerSource } from "@/layer"

const MAX_Z_INDEX = 2147483647

const ARROW_MOVE_STEP = 1
const ARROW_MOVE_STEP_LARGE = 10
const MOVE_EDGES = ["top", "right", "bottom", "left"] as const

const ARROW_KEY_DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
}

interface ImageOverlayProps {
  source: LayerSource
  onDelete: () => void
}

const fieldsetCva = cva("fixed m-0 box-border select-none border-none p-0 focus:outline-none", {
  variants: {
    dragging: {
      true: "cursor-grabbing",
      false: "cursor-move",
    },
  },
})
const moveEdgeCva = cva(
  "absolute cursor-grab border-blue-500 p-0 transition-opacity duration-200 active:cursor-grabbing",
  {
    variants: {
      edge: {
        top: "inset-x-0 -top-2 h-2 border-b",
        right: "inset-y-0 -right-2 w-2 border-l",
        bottom: "inset-x-0 -bottom-2 h-2 border-t",
        left: "inset-y-0 -left-2 w-2 border-r",
      },
      visible: {
        true: "opacity-100",
        false: "opacity-0",
      },
      // Hidden edges sit outside the layer, so they let page clicks through while hover can reveal them.
      passThrough: {
        true: "pointer-events-none",
      },
    },
  },
)
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

export function ImageOverlay({ source, onDelete }: ImageOverlayProps) {
  const options = LAYER_OPTIONS[source.kind]
  const [state, dispatch] = useReducer(imageOverlayReducer, options.initialState)
  const [isHovered, setIsHovered] = useState(false)

  const { isDragging, isResizing, snapGuides, handleDragStart, handleResizeStart } = useDragAndResize({
    state,
    dispatch,
  })

  const fieldsetRef = useRef<HTMLFieldSetElement>(null)

  const handleMoveStart: React.PointerEventHandler<HTMLElement> = (event) => {
    event.stopPropagation()
    handleDragStart(event, true)
    fieldsetRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFieldSetElement>) => {
    if ((event.key === "Backspace" || event.key === "Delete") && (event.target as HTMLElement).tagName !== "INPUT") {
      event.preventDefault()
      event.stopPropagation()
      onDelete()
    }
    const direction = ARROW_KEY_DIRECTIONS[event.key]
    if (direction && (event.target as HTMLElement).tagName !== "INPUT") {
      event.preventDefault()
      event.stopPropagation()
      const step = event.shiftKey ? ARROW_MOVE_STEP_LARGE : ARROW_MOVE_STEP
      dispatch({ type: "MOVE_POSITION", payload: { dx: direction.dx * step, dy: direction.dy * step } })
    }
  }

  const handleNaturalSize = useCallback((size: ImageOverlayState["size"]) => {
    dispatch({
      type: "SET_SIZE",
      payload: { width: Math.round(size.width), height: Math.round(size.height) },
    })
    dispatch({ type: "SET_ASPECT_RATIO", payload: size.width / size.height })
  }, [])

  const showHandles = isHovered || isDragging || !!isResizing

  return (
    <fieldset
      ref={fieldsetRef}
      aria-label="Draggable layer overlay"
      className={fieldsetCva({ dragging: isDragging })}
      style={{
        left: state.position.x,
        top: state.position.y,
        width: state.isVisibleImage ? state.size.width : undefined,
        height: state.isVisibleImage ? state.size.height : undefined,
        zIndex: MAX_Z_INDEX,
        touchAction: "none",
      }}
      tabIndex={-1}
      onPointerDown={(e) => {
        handleDragStart(e)
        fieldsetRef.current?.focus()
      }}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <LayerContent
        source={source}
        size={state.size}
        opacity={state.opacity}
        visible={state.isVisibleImage}
        interactive={!isDragging && !isResizing}
        onNaturalSize={handleNaturalSize}
      />
      {state.isVisibleImage &&
        MOVE_EDGES.map((edge) => (
          <button
            key={edge}
            type="button"
            aria-label={`Move from ${edge} edge`}
            title="Drag edge to move"
            // Pointer-only control; the fieldset already moves the layer with the arrow keys.
            tabIndex={-1}
            className={moveEdgeCva({
              edge,
              visible: showHandles,
              passThrough: !showHandles && options.passThroughInactiveEdges,
            })}
            onPointerDown={handleMoveStart}
          />
        ))}
      {/* Toolbar */}
      <ImageToolbar state={state} dispatch={dispatch} onDelete={onDelete} onMoveStart={handleMoveStart} />
      {/* Later siblings keep resize handles above overlapping move edges. */}
      {state.isVisibleImage &&
        RESIZE_DIRECTIONS.map((direction) => (
          <button
            key={direction}
            type="button"
            aria-label={`Resize from ${direction}`}
            className={resizeHandleCva({ direction, visible: showHandles })}
            onPointerDown={(event) => {
              handleResizeStart(direction)(event)
              fieldsetRef.current?.focus()
            }}
          />
        ))}
      {/* Snap guides */}
      {isDragging && snapGuides.vertical !== null && (
        <div
          data-testid="snap-guide-vertical"
          aria-hidden="true"
          className="pointer-events-none fixed top-0 h-screen w-px bg-red-500/80"
          style={{ left: snapGuides.vertical, zIndex: MAX_Z_INDEX }}
        />
      )}
      {isDragging && snapGuides.horizontal !== null && (
        <div
          data-testid="snap-guide-horizontal"
          aria-hidden="true"
          className="pointer-events-none fixed left-0 h-px w-screen bg-red-500/80"
          style={{ top: snapGuides.horizontal, zIndex: MAX_Z_INDEX }}
        />
      )}
    </fieldset>
  )
}
