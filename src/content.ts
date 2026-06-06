import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ImageOverlay } from "@/components/ImageOverlay"
import contentCss from "@/index.css?inline"
import type { SnapLayerMessage } from "@/types/messages"

let root: Root | null = null

const handleDeleteImage = () => {
  root?.unmount()
  root = null
}

const addImage = (imageData: string) => {
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
  root.render(createElement(ImageOverlay, { imageData, onDelete: handleDeleteImage }))
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ADD_IMAGE") {
    addImage((message as SnapLayerMessage).imageData)
  }
})
