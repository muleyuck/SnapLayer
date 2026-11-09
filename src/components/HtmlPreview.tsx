import { useEffect, useRef, useState } from "react"
import {
  HTML_PREVIEW_PAGE,
  HTML_PREVIEW_READY,
  HTML_PREVIEW_REQUEST_PARAM,
  type HtmlPreviewRequest,
} from "@/htmlPreview"

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
    let active = true
    let timeout = 0
    const startTimeout = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setError(true), 10000)
    }
    setError(false)
    startTimeout()
    const connect = () => {
      startTimeout()
      // Runtime messages keep uploaded HTML out of the host page, which also cannot forge them.
      const request: HtmlPreviewRequest = { type: "RENDER_HTML", html, requestId }
      chrome.runtime.sendMessage(request).then(
        (reply) => {
          if (!active || reply?.type !== HTML_PREVIEW_READY) return
          window.clearTimeout(timeout)
          setError(false)
        },
        // No preview page answered; the timeout reports it.
        () => {},
      )
    }
    // Send again on every load so a reloaded preview document is not left blank.
    frame.addEventListener("load", connect)
    frame.src = chrome.runtime.getURL(`${HTML_PREVIEW_PAGE}?${HTML_PREVIEW_REQUEST_PARAM}=${requestId}`)
    return () => {
      active = false
      frame.removeEventListener("load", connect)
      window.clearTimeout(timeout)
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
