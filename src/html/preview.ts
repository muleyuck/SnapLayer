import {
  HTML_PREVIEW_READY,
  HTML_PREVIEW_REQUEST_PARAM,
  HTML_SANDBOX_PAGE,
  type HtmlPreviewRequest,
} from "../htmlPreview"

const requestId = new URLSearchParams(location.search).get(HTML_PREVIEW_REQUEST_PARAM)
let frame: HTMLIFrameElement | null = null

// Runtime messages come only from SnapLayer itself; the host page can reach this frame but cannot send them.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    frame ||
    !requestId ||
    message?.type !== "RENDER_HTML" ||
    message.requestId !== requestId ||
    typeof message.html !== "string"
  )
    return
  const request: HtmlPreviewRequest = message
  const sandbox = document.createElement("iframe")
  frame = sandbox
  sandbox.title = "Sandboxed HTML"
  // Keep replacement documents isolated when the host navigates this frame.
  sandbox.setAttribute("sandbox", "allow-scripts")
  sandbox.addEventListener(
    "load",
    () => {
      sandbox.contentWindow?.postMessage({ type: "RENDER_HTML", html: request.html }, "*")
    },
    { once: true },
  )
  window.addEventListener("message", (reply) => {
    if (reply.source === sandbox.contentWindow && reply.origin === "null" && reply.data?.type === HTML_PREVIEW_READY) {
      sendResponse({ type: HTML_PREVIEW_READY })
    }
  })
  sandbox.src = HTML_SANDBOX_PAGE
  document.body.appendChild(sandbox)
  return true
})
