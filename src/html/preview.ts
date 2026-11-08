import { HTML_PREVIEW_READY, HTML_SANDBOX_PAGE, type HtmlPreviewRequest } from "../htmlPreview"

let connected = false

window.addEventListener("message", (event: MessageEvent) => {
  if (
    connected ||
    event.source !== parent ||
    event.data?.type !== "RENDER_HTML" ||
    typeof event.data.html !== "string" ||
    typeof event.data.requestId !== "string" ||
    event.data.requestId.length === 0
  )
    return
  connected = true
  const request: HtmlPreviewRequest = event.data
  const frame = document.createElement("iframe")
  frame.title = "Sandboxed HTML"
  frame.addEventListener(
    "load",
    () => {
      frame.contentWindow?.postMessage({ type: "RENDER_HTML", html: request.html }, "*")
    },
    { once: true },
  )
  window.addEventListener("message", (reply) => {
    if (reply.source === frame.contentWindow && reply.origin === "null" && reply.data?.type === HTML_PREVIEW_READY) {
      parent.postMessage({ type: reply.data.type, requestId: request.requestId }, event.origin)
    }
  })
  frame.src = HTML_SANDBOX_PAGE
  document.body.appendChild(frame)
})
