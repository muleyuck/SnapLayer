import { useEffect, useRef, useState } from "react"
import { HTML_PREVIEW_PAGE, HTML_PREVIEW_READY, type HtmlPreviewRequest } from "@/htmlPreview"

interface HtmlPreviewProps {
  html: string
  width: number
  height: number
  opacity: number
  visible: boolean
  interactive: boolean
}

export function HtmlPreview({ html, width, height, opacity, visible, interactive }: HtmlPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const requestId = crypto.getRandomValues(new Uint32Array(4)).join("-")
    const extensionOrigin = chrome.runtime.getURL("").replace(/\/$/, "")
    setError(false)
    const timeout = window.setTimeout(() => setError(true), 10000)
    const acknowledge = (event: MessageEvent) => {
      // The host page can forge MessageEvent fields, but not isTrusted.
      if (
        !event.isTrusted ||
        event.source !== frame.contentWindow ||
        event.origin !== extensionOrigin ||
        event.data?.type !== HTML_PREVIEW_READY ||
        event.data?.requestId !== requestId
      )
        return
      window.clearTimeout(timeout)
      setError(false)
    }
    const connect = () => {
      // Keep uploaded HTML out of the host DOM and send it only to an extension origin.
      const request: HtmlPreviewRequest = { type: "RENDER_HTML", html, requestId }
      frame.contentWindow?.postMessage(request, extensionOrigin)
    }
    window.addEventListener("message", acknowledge)
    frame.addEventListener("load", connect, { once: true })
    frame.src = chrome.runtime.getURL(HTML_PREVIEW_PAGE)
    return () => {
      frame.removeEventListener("load", connect)
      window.clearTimeout(timeout)
      window.removeEventListener("message", acknowledge)
    }
  }, [html])

  return (
    <>
      <iframe
        ref={frameRef}
        title="HTML preview"
        style={{
          width,
          height,
          opacity: opacity / 100,
          display: visible ? "block" : "none",
          pointerEvents: interactive ? "auto" : "none",
          border: 0,
        }}
      />
      {error && (
        <p role="alert" className="absolute top-10 left-2 rounded bg-red-700 p-2 text-sm text-white">
          Could not load the HTML preview. Reload SnapLayer and try again.
        </p>
      )}
    </>
  )
}
