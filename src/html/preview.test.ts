import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest"
import { HTML_PREVIEW_READY, HTML_SANDBOX_PAGE } from "../htmlPreview"

const { JSDOM } = createRequire(resolve("package.json"))("jsdom") as {
  JSDOM: new (
    html: string,
    options: { url: string; runScripts: "outside-only" | "dangerously" },
  ) => { window: Window & typeof globalThis }
}
const sandboxHtml = readFileSync(resolve("public", HTML_SANDBOX_PAGE), "utf8")

describe("HTML preview isolation boundary", () => {
  let listeners: EventListenerOrEventListenerObject[]
  let onMessage: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => unknown

  async function loadPreview(search: string) {
    window.history.replaceState(null, "", `/html-preview.html${search}`)
    vi.resetModules()
    await import("./preview")
    const registration = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    assert(registration)
    onMessage = registration as typeof onMessage
  }

  beforeEach(async () => {
    listeners = []
    const add = window.addEventListener.bind(window)
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "message") listeners.push(listener)
      add(type, listener, options)
    })
    await loadPreview("?request=request-27")
  })

  afterEach(() => {
    for (const listener of listeners) window.removeEventListener("message", listener)
    document.body.replaceChildren()
    window.history.replaceState(null, "", "/")
    vi.restoreAllMocks()
  })

  function request(data: unknown = { type: "RENDER_HTML", html: "<h1>Mock</h1>", requestId: "request-27" }) {
    const sendResponse = vi.fn()
    const keepsChannelOpen = onMessage(data, { id: "snaplayer-test" }, sendResponse)
    return { sendResponse, keepsChannelOpen }
  }

  it("ignores host-page window messages", () => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: window,
        origin: "https://comparison.example",
        data: { type: "RENDER_HTML", html: "<h1>Forged</h1>", requestId: "request-27" },
      }),
    )
    expect(document.querySelector("iframe")).toBeNull()
  })

  it.each([
    ["type", { type: "FETCH", url: "https://private.example" }],
    ["HTML", { type: "RENDER_HTML", html: 42, requestId: "request-27" }],
    ["missing request ID", { type: "RENDER_HTML", html: "<h1>Mock</h1>" }],
    ["request ID of another preview", { type: "RENDER_HTML", html: "<h1>Mock</h1>", requestId: "request-91" }],
    ["missing data", null],
  ])("ignores an invalid request: %s", (_invalid, data) => {
    expect(request(data).keepsChannelOpen).toBeUndefined()
    expect(document.querySelector("iframe")).toBeNull()
  })

  it("ignores every request when the page was opened without a request ID", async () => {
    await loadPreview("")
    request({ type: "RENDER_HTML", html: "<h1>Mock</h1>", requestId: "" })
    expect(document.querySelector("iframe")).toBeNull()
  })

  it("passes HTML only into the declared sandbox and answers once the sandbox renders it", () => {
    const html = "<!doctype html><h1>日本語の mock</h1><script>window.mock = true</script>"
    const { sendResponse, keepsChannelOpen } = request({ type: "RENDER_HTML", html, requestId: "request-27" })
    expect(keepsChannelOpen).toBe(true)
    const frame = document.querySelector("iframe")
    assert(frame?.contentWindow)
    expect(frame.getAttribute("src")).toBe(HTML_SANDBOX_PAGE)
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts")
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    expect(post).not.toHaveBeenCalled()
    frame.dispatchEvent(new Event("load"))
    expect(post).toHaveBeenCalledWith({ type: "RENDER_HTML", html, readyType: HTML_PREVIEW_READY }, "*")
    expect(document.body.innerHTML).not.toContain("日本語の mock")

    const sandbox = new JSDOM(sandboxHtml, {
      url: "chrome-extension://snaplayer-test/html-sandbox.html",
      runScripts: "outside-only",
    })
    try {
      const reply = vi.spyOn(sandbox.window.parent, "postMessage").mockImplementation(() => {})
      const script = sandbox.window.document.querySelector("script")?.textContent
      assert(script)
      sandbox.window.eval(script)
      sandbox.window.dispatchEvent(
        new sandbox.window.MessageEvent("message", {
          source: sandbox.window,
          origin: "chrome-extension://snaplayer-test",
          data: post.mock.calls[0][0],
        }),
      )
      const documentFrame = sandbox.window.document.querySelector("iframe")
      assert(documentFrame)
      expect(documentFrame.srcdoc).toBe(html)
      expect(documentFrame.getAttribute("sandbox")).toBe("allow-scripts")
      expect(reply).toHaveBeenCalledWith({ type: HTML_PREVIEW_READY }, "chrome-extension://snaplayer-test")

      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          origin: "null",
          data: reply.mock.calls[0][0],
        }),
      )
      expect(sendResponse).not.toHaveBeenCalled()
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "https://example.com",
          data: reply.mock.calls[0][0],
        }),
      )
      expect(sendResponse).not.toHaveBeenCalled()
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "null",
          data: reply.mock.calls[0][0],
        }),
      )
      expect(sendResponse).toHaveBeenCalledWith({ type: HTML_PREVIEW_READY })
    } finally {
      sandbox.window.close()
    }
  })

  it("accepts a valid request after malformed input and ignores replacement requests", () => {
    request({ type: "RENDER_HTML", html: { unsafe: true }, requestId: "request-27" })
    request({ type: "RENDER_HTML", html: "<h1>Allowed mock</h1>", requestId: "request-27" })
    const frame = document.querySelector("iframe")
    assert(frame?.contentWindow)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    frame.dispatchEvent(new Event("load"))
    request({ type: "RENDER_HTML", html: "<h1>Replacement</h1>", requestId: "request-27" })
    frame.dispatchEvent(new Event("load"))
    expect(document.querySelectorAll("iframe")).toHaveLength(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      { type: "RENDER_HTML", html: "<h1>Allowed mock</h1>", readyType: HTML_PREVIEW_READY },
      "*",
    )
  })

  it("preserves the uploaded HTML and its own Delete shortcut", () => {
    const sandbox = new JSDOM(sandboxHtml, {
      url: "chrome-extension://snaplayer-test/html-sandbox.html",
      runScripts: "outside-only",
    })
    try {
      const script = sandbox.window.document.querySelector("script")?.textContent
      assert(script)
      sandbox.window.eval(script)
      const html =
        '<!doctype html><body><p id="card">Card</p><script>addEventListener("keydown", e => { if (e.key === "Delete") document.getElementById("card").remove() })</script></body>'
      sandbox.window.dispatchEvent(
        new sandbox.window.MessageEvent("message", {
          source: sandbox.window,
          origin: "chrome-extension://snaplayer-test",
          data: { type: "RENDER_HTML", html, readyType: HTML_PREVIEW_READY },
        }),
      )
      const frame = sandbox.window.document.querySelector("iframe")
      assert(frame)
      expect(frame.srcdoc).toBe(html)
      const preview = new JSDOM(frame.srcdoc, { url: "about:srcdoc", runScripts: "dangerously" })
      try {
        const post = vi.spyOn(preview.window.parent, "postMessage").mockImplementation(() => {})
        const event = new preview.window.KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true })
        preview.window.document.body.dispatchEvent(event)
        expect(preview.window.document.getElementById("card")).toBeNull()
        expect(event.defaultPrevented).toBe(false)
        expect(post).not.toHaveBeenCalled()
      } finally {
        preview.window.close()
      }
    } finally {
      sandbox.window.close()
    }
  })

  it("uses the acknowledgement type supplied by its trusted parent", () => {
    const sandbox = new JSDOM(sandboxHtml, {
      url: "chrome-extension://snaplayer-test/html-sandbox.html",
      runScripts: "outside-only",
    })
    try {
      const reply = vi.spyOn(sandbox.window.parent, "postMessage").mockImplementation(() => {})
      const script = sandbox.window.document.querySelector("script")?.textContent
      assert(script)
      sandbox.window.eval(script)
      sandbox.window.dispatchEvent(
        new sandbox.window.MessageEvent("message", {
          source: sandbox.window,
          origin: "chrome-extension://snaplayer-test",
          data: { type: "RENDER_HTML", html: "<h1>Mock</h1>", readyType: "RENAMED_READY" },
        }),
      )
      expect(reply).toHaveBeenCalledWith({ type: "RENAMED_READY" }, "chrome-extension://snaplayer-test")
    } finally {
      sandbox.window.close()
    }
  })

  it.each(["parent", "origin", "payload", "missing ready type", "invalid ready type", "empty ready type"])(
    "sandbox rejects a message with an invalid %s",
    (invalid) => {
      const sandbox = new JSDOM(sandboxHtml, {
        url: "chrome-extension://snaplayer-test/html-sandbox.html",
        runScripts: "outside-only",
      })
      try {
        const script = sandbox.window.document.querySelector("script")?.textContent
        assert(script)
        sandbox.window.eval(script)
        sandbox.window.dispatchEvent(
          new sandbox.window.MessageEvent("message", {
            source: invalid === "parent" ? null : sandbox.window,
            origin: invalid === "origin" ? "https://example.com" : "chrome-extension://snaplayer-test",
            data: {
              type: "RENDER_HTML",
              html: invalid === "payload" ? 42 : "<h1>Mock</h1>",
              readyType:
                invalid === "missing ready type"
                  ? undefined
                  : invalid === "invalid ready type"
                    ? 42
                    : invalid === "empty ready type"
                      ? ""
                      : HTML_PREVIEW_READY,
            },
          }),
        )
        expect(sandbox.window.document.querySelectorAll("iframe")).toHaveLength(0)
      } finally {
        sandbox.window.close()
      }
    },
  )
})
