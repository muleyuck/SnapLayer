import { type Dispatch, type SetStateAction, useState } from "react"
import { CloseIcon, ExpandIcon, EyeIcon, EyeSlashIcon, LockIcon, SettingsIcon, UnlockIcon } from "@/components/Icons"
import type { Position, Size } from "@/types/ImageRect"

type ImageToolbarProps = {
  size: Size
  setSize: Dispatch<SetStateAction<Size>>
  opacity: number
  setOpacity: Dispatch<SetStateAction<number>>
  aspectRatio: number
  setAspectRatio: Dispatch<SetStateAction<number>>
  lockAspectRatio: boolean
  setLockAspectRatio: Dispatch<SetStateAction<boolean>>
  setPosition: Dispatch<SetStateAction<Position>>
  isVisibleImage: boolean
  setIsVisibleImage: Dispatch<SetStateAction<boolean>>
  onDelete: () => void
}

export const ImageToolbar = ({
  size,
  setSize,
  opacity,
  setOpacity,
  aspectRatio,
  setAspectRatio,
  lockAspectRatio,
  setLockAspectRatio,
  setPosition,
  isVisibleImage,
  setIsVisibleImage,
  onDelete,
}: ImageToolbarProps) => {
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
        className="cursor-pointer rounded hover:bg-gray-700"
      >
        <SettingsIcon />
      </button>

      {/* Expandable content */}
      <div
        className={`flex items-center gap-1.5 overflow-hidden transition-all duration-150 ${
          isToolbarExpand ? "ml-1.5 max-w-full opacity-100" : "min-w-0 max-w-0 opacity-0"
        }`}
      >
        {/* Size Input */}
        <input
          type="number"
          min={10}
          value={size.width}
          onChange={(e) => {
            const w = Math.max(10, parseInt(e.target.value, 10) || 10)
            if (lockAspectRatio) {
              setSize({ width: w, height: Math.max(10, Math.round(w / aspectRatio)) })
            } else {
              setSize((s) => ({ ...s, width: w }))
            }
          }}
          title="Width (px)"
          aria-label="Width (px)"
          className="w-14 rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5"
        />
        <input
          type="number"
          min={10}
          value={size.height}
          onChange={(e) => {
            const h = Math.max(10, parseInt(e.target.value, 10) || 10)
            if (lockAspectRatio) {
              setSize({ width: Math.max(10, Math.round(h * aspectRatio)), height: h })
            } else {
              setSize((s) => ({ ...s, height: h }))
            }
          }}
          title="Height (px)"
          aria-label="Height (px)"
          className="w-14 rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5"
        />
        <button
          type="button"
          onClick={() => {
            if (!lockAspectRatio) {
              // When locking, calculate aspect ratio from current size
              setAspectRatio(size.width / size.height)
            }
            setLockAspectRatio((v) => !v)
          }}
          title={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-label={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          className="cursor-pointer rounded p-0.5 hover:bg-gray-700"
        >
          {lockAspectRatio ? <LockIcon /> : <UnlockIcon />}
        </button>
        <button
          type="button"
          onClick={() => {
            if (lockAspectRatio) {
              const w = window.innerWidth
              setSize({ width: w, height: Math.max(10, Math.round(w / aspectRatio)) })
            } else {
              setSize({ width: window.innerWidth, height: window.innerHeight })
            }
            setPosition({ x: 0, y: 0 })
          }}
          title="Adjust Viewport"
          aria-label="Adjust Viewport"
          className="cursor-pointer rounded p-0.5 hover:bg-gray-700"
        >
          <ExpandIcon />
        </button>
        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => setIsVisibleImage((v) => !v)}
          title={isVisibleImage ? "Hide image" : "Show image"}
          aria-label={isVisibleImage ? "Hide image" : "Show image"}
          className="cursor-pointer rounded p-0.5 hover:bg-gray-700"
        >
          {isVisibleImage ? <EyeIcon /> : <EyeSlashIcon />}
        </button>
        {/* Opacity slider */}
        <span className="ml-1 text-gray-400 text-sm">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
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
          className="ml-1 cursor-pointer rounded bg-red-600 p-0.5 hover:bg-red-700"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
