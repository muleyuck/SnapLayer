import { cva } from "class-variance-authority"
import { useState } from "react"
import { CloseIcon, ExpandIcon, EyeIcon, EyeSlashIcon, LockIcon, SettingsIcon, UnlockIcon } from "@/components/Icons"
import type { ImageOverlayAction, ImageOverlayState } from "@/hooks/imageOverlayReducer"

const toolbarCva = cva("flex items-center gap-1.5 overflow-hidden transition-all duration-150", {
  variants: {
    expand: {
      true: "ml-1.5 max-w-full opacity-100",
      false: "min-w-0 max-w-0 opacity-0",
    },
  },
})
const inputCva = cva("w-14 rounded border border-natural-600 bg-gray-800 px-1.5 py-0.5")
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
}

export const ImageToolbar = ({ state, dispatch, onDelete }: ImageToolbarProps) => {
  const [isToolbarExpand, setIsToolbarExpand] = useState(true)
  return (
    <div
      role="toolbar"
      aria-label="Image controls"
      className="absolute top-2 left-2 flex h-7 items-center whitespace-nowrap rounded-md bg-black/85 px-2.5 font-sans text-white text-xs transition-all duration-150"
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsToolbarExpand((v) => !v)}
        aria-label={isToolbarExpand ? "Collapse toolbar" : "Expand toolbar"}
        aria-expanded={isToolbarExpand}
        className={buttonCva({ color: "natural", rightSpace: false })} // "cursor-pointer rounded p-0.5 hover:bg-gray-700"}
      >
        <SettingsIcon />
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
            if (state.lockAspectRatio) {
              dispatch({ type: "SET_ASPECT_RATIO", payload: state.size.width / state.size.height })
            }
            dispatch({ type: "TOGGLE_LOCK_ASPECT_RATIO" })
          }}
          title={state.lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-label={state.lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          className={buttonCva({ color: "natural", rightSpace: false })}
        >
          {state.lockAspectRatio ? <LockIcon /> : <UnlockIcon />}
        </button>
        {/* Adjust image size to Viewport toggle */}
        <button
          type="button"
          onClick={() => {
            const width = window.innerWidth
            const height = state.lockAspectRatio ? Math.round(width / state.aspectRatio) : window.innerHeight
            dispatch({ type: "SET_SIZE", payload: { width, height } })
            dispatch({ type: "SET_POSITION", payload: { x: 0, y: 0 } })
          }}
          title="Fit to Viewport"
          aria-label="Fit to Viewport"
          className={buttonCva({ color: "natural", rightSpace: false })}
        >
          <ExpandIcon />
        </button>
        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_VISIBILITY" })}
          title={state.isVisibleImage ? "Hide image" : "Show image"}
          aria-label={state.isVisibleImage ? "Hide image" : "Show image"}
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
