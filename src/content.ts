import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ImageOverlay } from "@/components/ImageOverlay"
import contentCss from "@/index.css?inline"
import type { LayerSource } from "@/layer"
import type { SnapLayerMessage } from "@/types/messages"

let root: Root | null = null

const handleDeleteImage = () => {
  root?.unmount()
  root = null
}

const addLayer = (message: SnapLayerMessage) => {
  if (!root) {
    const snapLayerHost = document.createElement("div")
    snapLayerHost.id = "snapLayer-host"
    document.body.appendChild(snapLayerHost)

    const shadowHost = snapLayerHost.attachShadow({ mode: "open" })

    const styleElem = document.createElement("style")
    styleElem.textContent = contentCss
    shadowHost.appendChild(styleElem)

    const snapLayerRoot = document.createElement("div")
    snapLayerRoot.id = "snapLayer-root"
    shadowHost.appendChild(snapLayerRoot)

    root = createRoot(snapLayerRoot)
  }
  const source: LayerSource =
    message.type === "ADD_IMAGE" ? { kind: "image", dataUrl: message.imageData } : { kind: "html", html: message.html }
  root.render(createElement(ImageOverlay, { source, key: source.kind, onDelete: handleDeleteImage }))
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ADD_IMAGE") {
    addLayer(message as SnapLayerMessage)
  } else if (message?.type === "ADD_HTML" && typeof message.html === "string") {
    addLayer(message as SnapLayerMessage)
  }
})
