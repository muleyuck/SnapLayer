import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script"
import { ImageOverlay } from "@/components/ImageOverlay"
import contentCss from "@/index.css?inline"
import type { SnapLayerMessage } from "@/types/messages"

// Keep root globally to avoid creating multiple root elements
let root: Root | null = null

const handleDeleteImage = () => {
  root?.unmount()
  root = null
}

const addImage = (imageData: string) => {
  if (!root) {
    // Create element with Shadow DOM for style isolation
    const snapLayerHost = document.createElement("div")
    snapLayerHost.id = "snapLayer-host"
    document.body.appendChild(snapLayerHost)

    const shadowHost = snapLayerHost.attachShadow({ mode: "open" })

    // Style
    const styleElem = document.createElement("style")
    styleElem.textContent = contentCss
    shadowHost.appendChild(styleElem)

    // React Root
    const snapLayerRoot = document.createElement("div")
    snapLayerRoot.id = "snapLayer-root"
    shadowHost.appendChild(snapLayerRoot)

    root = createRoot(snapLayerRoot)
  }
  root.render(createElement(ImageOverlay, { imageData, onDelete: handleDeleteImage }))
}

// Register message listener synchronously at module top-level.
// WXT compiles this as an IIFE, so the listener is guaranteed to be registered
// before chrome.scripting.executeScript({ files }) resolves in the popup.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ADD_IMAGE") {
    addImage((message as SnapLayerMessage).imageData)
  }
})

export default defineUnlistedScript(() => {})
