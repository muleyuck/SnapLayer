import type { LayerSource } from "@/layer"

export async function readClipboardSource(clipboard: DataTransfer | null): Promise<LayerSource> {
  const items = Array.from(clipboard?.items ?? [])
  if (!items.length) {
    throw new Error("Cant't get pasted item from clipboard")
  }

  const image = items.find((item) => item.type.startsWith("image/"))
  if (image) {
    const file = image.getAsFile()
    if (!file) throw new Error("Fail to convert pasted image to file")
    return readImageSource(file)
  }

  const plainText = items.find((item) => item.type === "text/plain")
  if (plainText) {
    const text = await new Promise<string>((resolve) => plainText.getAsString(resolve))
    const trimmed = text.trim()
    if (!trimmed) throw new Error("Pasted item has no content")

    if (/^<svg(?=[\t\n\f\r />])/.test(trimmed)) {
      return readImageSource(new Blob([text], { type: "image/svg+xml" }))
    }
    if (isHtmlSource(trimmed)) {
      return readLayerSource(new File([text], "clipboard.html", { type: "text/html" }))
    }
  }
  throw new Error("Paste an image, SVG source, or HTML source")
}

function isHtmlSource(text: string): boolean {
  if (/^<!doctype[\t\n\f\r ]+html(?:[\t\n\f\r ][^>]*|)>/i.test(text)) return true
  const tag = /^<([a-z][a-z0-9]*)(?=[\t\n\f\r />])[^>]*>/i.exec(text)
  return tag !== null && !(document.createElement(tag[1]) instanceof HTMLUnknownElement)
}

export async function readLayerSource(file: File): Promise<LayerSource> {
  if (file.type === "text/html" || /\.html?$/i.test(file.name)) {
    return { kind: "html", html: await file.text() }
  }
  return readImageSource(file)
}

export async function readImageSource(file: Blob): Promise<Extract<LayerSource, { kind: "image" }>> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  return { kind: "image", dataUrl }
}
