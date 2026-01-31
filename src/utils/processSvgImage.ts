/**
 * Process SVG to set preserveAspectRatio="none" so it stretches with container
 */
export function processSvgImage(imageData: string | undefined): string | undefined {
  if (!imageData) return imageData
  if (!imageData.startsWith("data:image/svg+xml")) return imageData

  try {
    let svgContent: string
    if (imageData.includes("base64,")) {
      const base64 = imageData.split("base64,")[1]
      svgContent = atob(base64)
    } else {
      const encoded = imageData.split(",")[1]
      svgContent = decodeURIComponent(encoded)
    }

    if (svgContent.includes("preserveAspectRatio")) {
      svgContent = svgContent.replace(/preserveAspectRatio=["'][^"']*["']/, 'preserveAspectRatio="none"')
    } else {
      svgContent = svgContent.replace(/<svg/, '<svg preserveAspectRatio="none"')
    }

    return `data:image/svg+xml;base64,${btoa(svgContent)}`
  } catch {
    return imageData
  }
}
