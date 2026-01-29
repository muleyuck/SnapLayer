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
  if (!tab.id) {
    throw new Error("Not fount Active Tab")
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: "ADD_IMAGE",
    imageData: dataUrl,
  } as SendMessage)

  // Close popup after successful upload
  window.close()
}

export default function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    setError(null)

    try {
      const dataUrl = await fileToDataUrl(file)
      sendMessage(dataUrl)
    } catch (err) {
      setError("Error Occurred!")
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
    if (!items || !items.length) {
      return
    }
    const item = items[0]
    let dataUrl: string | null = null
    // ① Images (png, jpg, svg image)
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile()
      if (!file) {
        return
      }
      dataUrl = await fileToDataUrl(file)
    }

    // ② SVG as text
    if (item.type === "text/plain") {
      const text = await new Promise<string>((resolve) => {
        item.getAsString(resolve)
      })
      if (text.trim().startsWith("<svg")) {
        const blob = new Blob([text], {
          type: "image/svg+xml",
        })
        dataUrl = await fileToDataUrl(blob)
      }
    }
    console.log(dataUrl)
    if (!dataUrl) {
      return
    }
    try {
      sendMessage(dataUrl)
    } catch (err) {
      setError("Error occurred!")
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
