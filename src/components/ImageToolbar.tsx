import { cva } from "class-variance-authority"
import { useLayoutEffect, useRef, useState } from "react"
import {
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  LockSlashIcon,
  SettingsIcon,
  SettingsIconFilled,
} from "@/components/Icons"
import type { ImageOverlayAction, ImageOverlayState } from "@/hooks/imageOverlayReducer"

const TOOLBAR_INSET = 8

const toolbarCva = cva("flex items-center gap-1.5 overflow-hidden transition-all duration-150", {
  variants: {
    expand: {
      true: "ml-1.5 max-w-full opacity-100",
      false: "min-w-0 max-w-0 opacity-0",
    },
  },
})
const inputCva = cva("border-natural-600 w-16 cursor-text rounded border bg-gray-800 px-1.5 py-0.5")
const buttonCva = cva("cursor-pointer rounded p-0.5 text-sm", {
  variants: {
    color: {
      red: "bg-red-600 hover:bg-gray-700",
      natural: "hover:bg-gray-700",
    },
    rightSpace: {
      true: "ml-1",
      false: "",
    },
  },
})

interface ImageToolbarProps {
  state: ImageOverlayState
  dispatch: React.ActionDispatch<[action: ImageOverlayAction]>
  onDelete: () => void
  onMoveStart: React.PointerEventHandler<HTMLElement>
}

export const ImageToolbar = ({ state, dispatch, onDelete, onMoveStart }: ImageToolbarProps) => {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({
    width: 0,
    height: 0,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  })
  const [isToolbarExpand, setIsToolbarExpand] = useState(true)
  const [preExpandSnapshot, setPreExpandSnapshot] = useState<{
    position: { x: number; y: number }
    size: { width: number; height: number }
  } | null>(null)

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return
    const measure = () => {
      const { width, height } = toolbar.getBoundingClientRect()
      setLayout({ width, height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(toolbar)
    window.addEventListener("resize", measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Layer controls"
      className="flex h-7 cursor-grab items-center rounded-md bg-black/85 px-2.5 font-sans text-xs whitespace-nowrap text-white active:cursor-grabbing"
      onPointerDown={(event) => {
        if ((event.target as Element).closest("button, input, select, textarea")) {
          event.stopPropagation()
          return
        }
        onMoveStart(event)
      }}
      style={{
        position: "fixed",
        left: Math.max(0, Math.min(state.position.x + TOOLBAR_INSET, layout.viewportWidth - layout.width)),
        top: Math.max(0, Math.min(state.position.y + TOOLBAR_INSET, layout.viewportHeight - layout.height)),
        width: "max-content",
        maxWidth: "100vw",
      }}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsToolbarExpand((v) => !v)}
        aria-label={isToolbarExpand ? "Collapse toolbar" : "Expand toolbar"}
        aria-expanded={isToolbarExpand}
        className={buttonCva({ color: "natural", rightSpace: false })}
      >
        {isToolbarExpand ? <SettingsIcon /> : <SettingsIconFilled />}
      </button>

      {/* Expandable content */}
      <div className={toolbarCva({ expand: isToolbarExpand })}>
        {/* Size Input */}
        <input
          type="number"
          min={10}
          value={state.size.width}
          onChange={(e) => {
            const width = Math.max(10, parseInt(e.target.value, 10) || 10)
            const newSize = state.lockAspectRatio
              ? { width, height: Math.max(10, Math.round(width / state.aspectRatio)) }
              : { ...state.size, width }
            dispatch({ type: "SET_SIZE", payload: newSize })
          }}
          title="Width (px)"
          aria-label="Width (px)"
          className={inputCva()}
        />
        <input
          type="number"
          min={10}
          value={state.size.height}
          onChange={(e) => {
            const height = Math.max(10, parseInt(e.target.value, 10) || 10)
            const newSize = state.lockAspectRatio
              ? { width: Math.max(10, Math.round(height * state.aspectRatio)), height }
              : { ...state.size, height }
            dispatch({ type: "SET_SIZE", payload: newSize })
          }}
          title="Height (px)"
          aria-label="Height (px)"
          className={inputCva()}
        />
        {/* Lock aspect toggle */}
        <button
          type="button"
          onClick={() => {
            if (!state.lockAspectRatio) {
              dispatch({ type: "SET_ASPECT_RATIO", payload: state.size.width / state.size.height })
            }
            dispatch({ type: "TOGGLE_LOCK_ASPECT_RATIO" })
          }}
          title={state.lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-label={state.lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          className={buttonCva({ color: "natural", rightSpace: false })}
        >
          {state.lockAspectRatio ? <LockIcon /> : <LockSlashIcon />}
        </button>
        {/* Fit image to Viewport toggle */}
        <button
          type="button"
          onClick={() => {
            if (preExpandSnapshot === null) {
              setPreExpandSnapshot({ position: state.position, size: state.size })
              const width = window.innerWidth
              const height = state.lockAspectRatio ? Math.round(width / state.aspectRatio) : window.innerHeight
              dispatch({ type: "SET_SIZE", payload: { width, height } })
              dispatch({ type: "SET_POSITION", payload: { x: 0, y: 0 } })
            } else {
              dispatch({ type: "SET_SIZE", payload: preExpandSnapshot.size })
              dispatch({ type: "SET_POSITION", payload: preExpandSnapshot.position })
              setPreExpandSnapshot(null)
            }
          }}
          title={preExpandSnapshot ? "Restore size" : "Fit to Viewport"}
          aria-label={preExpandSnapshot ? "Restore size" : "Fit to Viewport"}
          className={buttonCva({ color: "natural", rightSpace: false })}
        >
          {preExpandSnapshot ? <CollapseIcon /> : <ExpandIcon />}
        </button>
        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_VISIBILITY" })}
          title={state.isVisibleImage ? "Hide layer" : "Show layer"}
          aria-label={state.isVisibleImage ? "Hide layer" : "Show layer"}
          className={buttonCva({ color: "natural", rightSpace: false })}
        >
          {state.isVisibleImage ? <EyeIcon /> : <EyeSlashIcon />}
        </button>
        {/* Opacity slider */}
        <span className="ml-1 text-natural-400 text-sm">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={state.opacity}
          onChange={(e) => {
            dispatch({ type: "SET_OPACITY", payload: parseInt(e.target.value, 10) })
          }}
          title="Opacity"
          aria-label="Opacity"
          className="w-15 cursor-pointer"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={state.opacity}
          onChange={(e) => {
            const opacity = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
            dispatch({ type: "SET_OPACITY", payload: opacity })
          }}
          title="Opacity (%)"
          aria-label="Opacity (%)"
          className={inputCva()}
        />
        <span className="text-natural-400 text-sm">%</span>
        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className={buttonCva({ color: "red", rightSpace: true })}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
