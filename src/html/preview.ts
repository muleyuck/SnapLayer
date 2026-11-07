import { HTML_PREVIEW_CONNECT, HTML_PREVIEW_READY, HTML_SANDBOX_PAGE, type HtmlPreviewRequest } from "../htmlPreview"

let connected = false

window.addEventListener("message", (event: MessageEvent) => {
  if (connected || event.source !== parent || event.data !== HTML_PREVIEW_CONNECT || event.ports.length !== 1) return
  connected = true
  const port = event.ports[0]
  const frame = document.createElement("iframe")
  frame.title = "Sandboxed HTML"
  let loaded = false
  let request: HtmlPreviewRequest | undefined
  const render = () => {
    if (loaded && request) frame.contentWindow?.postMessage(request, "*")
  }
  frame.addEventListener("load", () => {
    loaded = true
    render()
  })
  port.onmessage = ({ data }) => {
    if (request || data?.type !== "RENDER_HTML" || typeof data.html !== "string") return
    request = data
    render()
  }
  window.addEventListener("message", (reply) => {
    if (reply.source === frame.contentWindow && reply.origin === "null" && reply.data?.type === HTML_PREVIEW_READY) {
      port.postMessage({ type: HTML_PREVIEW_READY })
    }
  })
  frame.src = HTML_SANDBOX_PAGE
  document.body.appendChild(frame)
})
