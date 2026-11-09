export const HTML_PREVIEW_PAGE = "html-preview.html"
export const HTML_SANDBOX_PAGE = "html-sandbox.html"
export const HTML_PREVIEW_READY = "SNAPLAYER_HTML_READY"
export const HTML_PREVIEW_REQUEST_PARAM = "request"

export type HtmlPreviewRequest = { type: "RENDER_HTML"; html: string; requestId: string }

export type HtmlSandboxRequest = Pick<HtmlPreviewRequest, "type" | "html"> & {
  readyType: typeof HTML_PREVIEW_READY
}
