import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest"
import { HTML_PREVIEW_READY, type HtmlPreviewRequest } from "@/htmlPreview"
import { HtmlPreview } from "./HtmlPreview"

describe("HtmlPreview", () => {
  let replies: ((reply: unknown) => void)[]

  beforeEach(() => {
    vi.useFakeTimers()
    replies = []
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      () => new Promise((resolve) => replies.push(resolve)) as never,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function load() {
    const frame = screen.getByTitle("HTML preview") as HTMLIFrameElement
    fireEvent.load(frame)
    const calls = vi.mocked(chrome.runtime.sendMessage).mock.calls
    const request = calls.at(-1)?.[0] as unknown as HtmlPreviewRequest
    assert(request)
    return { frame, request, reply: replies.at(-1) as (reply: unknown) => void }
  }

  async function answer(reply: (reply: unknown) => void, value: unknown) {
    await act(async () => reply(value))
  }

  it("sends private HTML through the runtime to the preview page named by its request ID", async () => {
    const html = "<h1>Private design mock</h1>"
    render(<HtmlPreview html={html} width={640} height={480} opacity={100} visible interactive />)
    const { frame, request, reply } = load()
    expect(request).toEqual({ type: "RENDER_HTML", html, requestId: expect.any(String) })
    expect(request.requestId).not.toBe("")
    expect(frame.src).toBe(`chrome-extension://snaplayer-test/html-preview.html?request=${request.requestId}`)
    expect(document.body.innerHTML).not.toContain("Private design mock")
    await answer(reply, { type: HTML_PREVIEW_READY })
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it.each([
    ["no reply", undefined],
    ["another type", { type: "FETCH" }],
  ])("reports a failed preview when the runtime returns %s", async (_invalid, value) => {
    render(<HtmlPreview html="<h1>Mock</h1>" width={640} height={480} opacity={100} visible interactive />)
    const { reply } = load()
    await answer(reply, value)
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("reports a failed preview when no preview page receives the HTML", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValue(new Error("Receiving end does not exist."))
    render(<HtmlPreview html="<h1>Mock</h1>" width={640} height={480} opacity={100} visible interactive />)
    load()
    await act(async () => {})
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("sends the HTML again when the preview document reloads", async () => {
    render(<HtmlPreview html="<h1>Mock</h1>" width={640} height={480} opacity={100} visible interactive />)
    const first = load()
    await answer(first.reply, { type: HTML_PREVIEW_READY })
    const second = load()
    expect(second.request).toEqual(first.request)
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    await answer(second.reply, { type: HTML_PREVIEW_READY })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("ignores the previous request after switching HTML", async () => {
    const { rerender, unmount } = render(
      <HtmlPreview html="<h1>First</h1>" width={640} height={480} opacity={100} visible interactive />,
    )
    const first = load()
    rerender(<HtmlPreview html="<h1>Second</h1>" width={640} height={480} opacity={100} visible interactive />)
    const second = load()
    expect(second.request.requestId).not.toBe(first.request.requestId)
    expect(vi.mocked(chrome.runtime.sendMessage)).toHaveBeenCalledTimes(2)
    await answer(first.reply, { type: HTML_PREVIEW_READY })
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    await answer(second.reply, { type: HTML_PREVIEW_READY })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    unmount()
  })

  it("reports a missing renderer acknowledgement instead of leaving a blank layer indefinitely", () => {
    const { unmount } = render(
      <HtmlPreview html="<h1>Mock</h1>" width={640} height={480} opacity={100} visible interactive />,
    )
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the HTML preview")
    unmount()
  })
})
