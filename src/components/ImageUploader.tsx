import { useCallback, useEffect, useRef, useState } from "react"
import type { LayerSource } from "@/layer"
import { readClipboardSource, readLayerSource } from "@/utils/readLayerSource"

interface Props {
  onLoad: (source: LayerSource) => Promise<void>
}

export default function ImageUploader({ onLoad }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    try {
      if (!file) {
        throw new Error("Can't get selected file")
      }
      await onLoad(await readLayerSource(file))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected Error Occurred!")
      console.error(err)
    } finally {
      // Reset input for re-selecting same file
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      try {
        await onLoad(await readClipboardSource(e.clipboardData))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected Error Occurred!")
        console.error(err)
      }
    },
    [onLoad],
  )

  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("paste", handlePaste)
    }
  }, [handlePaste])

  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-gray-400 border-dashed bg-gray-50 p-8 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:bg-gray-700 dark:hover:border-blue-300/60 dark:hover:bg-blue-500/20">
        <h2 className="text-center text-sm">
          <p className="font-semibold">Select image or HTML</p>
          <p className="text-gray-500 dark:text-gray-300">JPEG, PNG, SVG, HTML</p>
          <p className="text-gray-500 dark:text-gray-300">Paste images, SVG or HTML source</p>
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpeg,.png,.svg,.html,.htm,image/jpeg,image/png,image/svg+xml,text/html"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
