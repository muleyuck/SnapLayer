import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, assert, describe, expect, it, vi } from "vitest"
import { HTML_PREVIEW_CONNECT, HTML_PREVIEW_READY } from "@/htmlPreview"
import { HtmlPreview } from "./HtmlPreview"

describe("HtmlPreview", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("sends private HTML through a port to the extension origin and waits for its acknowledgement", async () => {
    const clearTimeout = vi.spyOn(window, "clearTimeout")
    const setTimeout = vi.spyOn(window, "setTimeout")
    const html = "<h1>Private design mock</h1>"
    const { unmount } = render(<HtmlPreview html={html} width={640} height={480} opacity={100} visible interactive />)
    const timeout = setTimeout.mock.results[0].value
    const frame = screen.getByTitle("HTML preview") as HTMLIFrameElement
    assert(frame.contentWindow)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    fireEvent.load(frame)
    expect(post).toHaveBeenCalledWith(HTML_PREVIEW_CONNECT, "chrome-extension://snaplayer-test", expect.any(Array))
    const [, , ports] = post.mock.calls[0] as unknown as [unknown, string, MessagePort[]]
    const port = ports[0]
    const request = await new Promise((resolve) => {
      port.onmessage = ({ data }) => resolve(data)
    })
    expect(request).toEqual({ type: "RENDER_HTML", html })
    expect(document.body.innerHTML).not.toContain("Private design mock")
    port.postMessage({ type: HTML_PREVIEW_READY })
    await waitFor(() => expect(clearTimeout).toHaveBeenCalledWith(timeout))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    unmount()
    port.close()
  })

  it("reports a missing renderer acknowledgement instead of leaving a blank layer indefinitely", () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <HtmlPreview html="<h1>Mock</h1>" width={640} height={480} opacity={100} visible interactive />,
    )
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the HTML preview")
    unmount()
  })
})
