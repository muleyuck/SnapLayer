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

  beforeEach(async () => {
    listeners = []
    const add = window.addEventListener.bind(window)
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "message") listeners.push(listener)
      add(type, listener, options)
    })
    vi.resetModules()
    await import("./preview")
  })

  afterEach(() => {
    for (const listener of listeners) window.removeEventListener("message", listener)
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  function request(
    data: unknown = { type: "RENDER_HTML", html: "<h1>Mock</h1>", requestId: "request-27" },
    source: Window | null = window,
  ) {
    window.dispatchEvent(
      new MessageEvent("message", {
        source,
        origin: "https://comparison.example",
        data,
      }),
    )
  }

  it.each([
    ["source", undefined, null],
    ["type", { type: "FETCH", url: "https://private.example" }, window],
    ["HTML", { type: "RENDER_HTML", html: 42, requestId: "request-27" }, window],
    ["request ID", { type: "RENDER_HTML", html: "<h1>Mock</h1>" }, window],
    ["empty request ID", { type: "RENDER_HTML", html: "<h1>Mock</h1>", requestId: "" }, window],
  ])("ignores an invalid request: %s", (_invalid, data, source) => {
    request(data, source)
    expect(document.querySelector("iframe")).toBeNull()
  })

  it("passes HTML only into the declared sandbox and relays its acknowledgement to the parent origin", () => {
    const html = "<!doctype html><h1>日本語の mock</h1><script>window.mock = true</script>"
    request({ type: "RENDER_HTML", html, requestId: "request-27" })
    const frame = document.querySelector("iframe")
    assert(frame?.contentWindow)
    expect(frame.getAttribute("src")).toBe(HTML_SANDBOX_PAGE)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    expect(post).not.toHaveBeenCalled()
    frame.dispatchEvent(new Event("load"))
    expect(post).toHaveBeenCalledWith({ type: "RENDER_HTML", html }, "*")
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

      const acknowledge = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {})
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          origin: "null",
          data: reply.mock.calls[0][0],
        }),
      )
      expect(acknowledge).not.toHaveBeenCalled()
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "https://example.com",
          data: reply.mock.calls[0][0],
        }),
      )
      expect(acknowledge).not.toHaveBeenCalled()
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "null",
          data: reply.mock.calls[0][0],
        }),
      )
      expect(acknowledge).toHaveBeenCalledWith(
        { type: HTML_PREVIEW_READY, requestId: "request-27" },
        "https://comparison.example",
      )
    } finally {
      sandbox.window.close()
    }
  })

  it("accepts a valid request after malformed input and ignores replacement requests", () => {
    request({ type: "RENDER_HTML", html: { unsafe: true }, requestId: "bad-request" })
    request({ type: "RENDER_HTML", html: "<h1>Allowed mock</h1>", requestId: "request-27" })
    const frame = document.querySelector("iframe")
    assert(frame?.contentWindow)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    frame.dispatchEvent(new Event("load"))
    request({ type: "RENDER_HTML", html: "<h1>Replacement</h1>", requestId: "request-91" })
    frame.dispatchEvent(new Event("load"))
    expect(document.querySelectorAll("iframe")).toHaveLength(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith({ type: "RENDER_HTML", html: "<h1>Allowed mock</h1>" }, "*")
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
          data: { type: "RENDER_HTML", html },
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

  it.each(["parent", "origin", "payload"])("sandbox rejects a message with an invalid %s", (invalid) => {
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
          },
        }),
      )
      expect(sandbox.window.document.querySelector("iframe")).toBeNull()
    } finally {
      sandbox.window.close()
    }
  })
})
