import { useCallback, useEffect, useRef, useState } from "react"
import type { LayerSource } from "@/layer"
import { readImageSource, readLayerSource } from "@/utils/readLayerSource"

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

  const handlePasteImage = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      try {
        if (!items?.length) {
          throw new Error("Cant't get pasted item from clipboard")
        }
        const item = items[0]
        let pastedFile: File | Blob | null = null

        if (item.type.startsWith("image/")) {
          // ① Images (png, jpg, svg image)
          const file = item.getAsFile()
          if (!file) {
            setError("Fail to convert pasted image to file")
            return
          }
          pastedFile = file
        } else if (item.type === "text/plain") {
          // ② SVG as text
          const text = await new Promise<string>((resolve) => {
            item.getAsString(resolve)
          })
          const trimmed = text.trim()
          if (!trimmed) {
            throw new Error("Pasted item has no content")
          }
          if (!trimmed.startsWith("<svg")) {
            throw new Error("Pasted item as text/plain is only supported SVG")
          }

          pastedFile = new Blob([text], {
            type: "image/svg+xml",
          })
        }
        if (!pastedFile) {
          throw new Error("Can't get pasted item, Only support (jpeg, png and svg)")
        }
        await onLoad(await readImageSource(pastedFile))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected Error Occurred!")
        console.error(err)
      }
    },
    [onLoad],
  )

  useEffect(() => {
    document.addEventListener("paste", handlePasteImage)
    return () => {
      document.removeEventListener("paste", handlePasteImage)
    }
  }, [handlePasteImage])

  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-gray-400 border-dashed bg-gray-50 p-8 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:bg-gray-700 dark:hover:border-blue-300/60 dark:hover:bg-blue-500/20">
        <h2 className="text-center text-sm">
          <p className="font-semibold">Select image or HTML</p>
          <p className="text-gray-500 dark:text-gray-300">JPEG, PNG, SVG, HTML</p>
          <p className="text-gray-500 dark:text-gray-300">Paste images or SVG</p>
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
