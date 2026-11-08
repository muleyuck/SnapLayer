import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest"
import { HTML_PREVIEW_READY } from "@/htmlPreview"
import { HtmlPreview } from "./HtmlPreview"

describe("HtmlPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(window, "addEventListener")
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function load() {
    const frame = screen.getByTitle("HTML preview") as HTMLIFrameElement
    assert(frame.contentWindow)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    post.mockClear()
    fireEvent.load(frame)
    const request = post.mock.calls[0][0]
    return { frame, post, request }
  }

  function acknowledge(frame: HTMLIFrameElement, requestId: string, overrides: Partial<MessageEvent> = {}) {
    const registrations = vi.mocked(window.addEventListener).mock.calls.filter(([type]) => type === "message")
    const listener = registrations.at(-1)?.[1]
    assert(typeof listener === "function")
    // jsdom cannot deliver a browser-generated message from a chrome-extension origin.
    act(() =>
      listener.call(window, {
        isTrusted: true,
        source: frame.contentWindow,
        origin: "chrome-extension://snaplayer-test",
        data: { type: HTML_PREVIEW_READY, requestId },
        ...overrides,
      } as MessageEvent),
    )
  }

  it("sends private HTML only to the extension origin and accepts its acknowledgement", () => {
    const html = "<h1>Private design mock</h1>"
    render(<HtmlPreview html={html} width={640} height={480} opacity={100} visible interactive />)
    const { frame, post, request } = load()
    expect(post).toHaveBeenCalledWith(
      { type: "RENDER_HTML", html, requestId: expect.any(String) },
      "chrome-extension://snaplayer-test",
    )
    expect(request.requestId).not.toBe("")
    expect(document.body.innerHTML).not.toContain("Private design mock")
    acknowledge(frame, request.requestId)
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it.each([
    ["origin", { origin: "https://example.com" }],
    ["source", { source: window }],
    ["request", { data: { type: HTML_PREVIEW_READY, requestId: "another-request" } }],
    ["type", { data: { type: "FETCH" } }],
    ["synthetic event", { isTrusted: false }],
    ["missing data", { data: null }],
  ])("ignores an acknowledgement with an invalid %s", (_invalid, overrides) => {
    render(<HtmlPreview html="<h1>Mock</h1>" width={640} height={480} opacity={100} visible interactive />)
    const { frame, request } = load()
    acknowledge(frame, request.requestId, overrides)
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    acknowledge(frame, request.requestId)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("ignores the previous request after switching HTML", () => {
    const { rerender, unmount } = render(
      <HtmlPreview html="<h1>First</h1>" width={640} height={480} opacity={100} visible interactive />,
    )
    const { frame, request: first } = load()
    const remove = vi.spyOn(window, "removeEventListener")
    rerender(<HtmlPreview html="<h1>Second</h1>" width={640} height={480} opacity={100} visible interactive />)
    const { request: second } = load()
    expect(second.requestId).not.toBe(first.requestId)
    acknowledge(frame, first.requestId)
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    acknowledge(frame, second.requestId)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    unmount()
    expect(remove.mock.calls.filter(([type]) => type === "message")).toHaveLength(2)
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
