import { type ReactElement, useEffect, useMemo } from "react"
import { HtmlPreview } from "@/components/HtmlPreview"
import type { ImageOverlayState } from "@/hooks/imageOverlayReducer"
import type { LayerSource } from "@/layer"
import { processSvgImage } from "@/utils/processSvgImage"

interface ImageContentProps {
  dataUrl: string
  size: ImageOverlayState["size"]
  opacity: number
  visible: boolean
  onNaturalSize: (size: ImageOverlayState["size"]) => void
}

function ImageContent({ dataUrl, size, opacity, visible, onNaturalSize }: ImageContentProps) {
  const processedDataUrl = useMemo(() => processSvgImage(dataUrl), [dataUrl])

  useEffect(() => {
    const image = new Image()
    image.onload = () => onNaturalSize({ width: image.naturalWidth, height: image.naturalHeight })
    image.src = dataUrl
  }, [dataUrl, onNaturalSize])

  if (!visible) return null

  return (
    <img
      src={processedDataUrl}
      alt="overlay"
      className="pointer-events-none block"
      style={{ opacity: opacity / 100, width: size.width, height: size.height, objectFit: "fill" }}
      draggable={false}
    />
  )
}

interface LayerContentProps extends Omit<ImageContentProps, "dataUrl"> {
  source: LayerSource
  interactive: boolean
}

export function LayerContent({
  source,
  size,
  opacity,
  visible,
  interactive,
  onNaturalSize,
}: LayerContentProps): ReactElement {
  switch (source.kind) {
    case "image":
      return (
        <ImageContent
          dataUrl={source.dataUrl}
          size={size}
          opacity={opacity}
          visible={visible}
          onNaturalSize={onNaturalSize}
        />
      )
    case "html":
      return (
        <HtmlPreview
          html={source.html}
          width={size.width}
          height={size.height}
          opacity={opacity}
          visible={visible}
          interactive={interactive}
        />
      )
  }
}
