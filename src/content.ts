import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ImageOverlay } from "@/components/ImageOverlay"
import type { SendMessage } from "@/types/Message"
import contentCss from "./content.css?inline"

// Keep root globally to avoid creating multiple root elements
let root: Root | null = null

const handleDeleteImage = () => {
  root?.unmount()
  root = null
}

const renderApp = (imageData?: string) => {
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
  root.render(createElement(ImageOverlay, { imageData: imageData, onDelete: handleDeleteImage }))
}

// Receive messages when image uploaded in popup UI
chrome.runtime.onMessage.addListener((message: SendMessage, _sender, sendResponse) => {
  if (message.type === "ADD_IMAGE" && message.imageData) {
    renderApp(message.imageData)
    sendResponse({ success: true })
  }
  return true
})

console.log("[SnapLayer] Content script loaded")
