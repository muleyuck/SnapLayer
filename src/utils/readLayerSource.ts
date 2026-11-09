import type { LayerSource } from "@/layer"

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
