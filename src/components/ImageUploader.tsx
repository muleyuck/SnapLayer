import { useCallback, useEffect, useRef, useState } from "react"
import type { SendMessage } from "@/types/Message"

const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const sendMessage = async (dataUrl: string) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.id || !tab.url) {
    throw new Error("Not found Active Tab")
  }

  const message: SendMessage = {
    type: "ADD_IMAGE",
    imageData: dataUrl,
  }

  try {
    await chrome.tabs.sendMessage(tab.id, message)
  } catch {
    // Content script not loaded yet - reload the tab to inject it
    throw new Error("Please reload the page and try again")
  }

  // Close popup after successful upload
  window.close()
}

export default function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    try {
      if (!file) {
        throw new Error("Cant't get selected image")
      }
      const dataUrl = await fileToDataUrl(file)
      await sendMessage(dataUrl)
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

  const handlePasteImage = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    try {
      if (!items || !items.length) {
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
      const dataUrl = await fileToDataUrl(pastedFile)
      await sendMessage(dataUrl)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected Error Occurred!")
      console.error(err)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("paste", handlePasteImage)
    return () => {
      document.removeEventListener("paste", handlePasteImage)
    }
  }, [handlePasteImage])

  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-gray-300 border-dashed bg-gray-50 p-8 transition-colors hover:border-blue-500 hover:bg-blue-50">
        <h2 className="text-center text-sm">
          <p className="font-semibold">Paste or Select image</p>
          <p className="text-gray-500">(jpeg, png and svg.)</p>
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
