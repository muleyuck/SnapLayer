import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { MessageChannel } from "node:worker_threads"
import { waitFor } from "@testing-library/react"
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest"
import { HTML_PREVIEW_CONNECT, HTML_PREVIEW_READY, HTML_SANDBOX_PAGE } from "../htmlPreview"

const { JSDOM } = createRequire(resolve("package.json"))("jsdom") as {
  JSDOM: new (
    html: string,
    options: { url: string; runScripts: "outside-only" },
  ) => { window: Window & typeof globalThis }
}
const sandboxHtml = readFileSync(resolve("public", HTML_SANDBOX_PAGE), "utf8")

describe("HTML preview isolation boundary", () => {
  let listeners: EventListenerOrEventListenerObject[]
  let channels: MessageChannel[]

  beforeEach(async () => {
    listeners = []
    channels = []
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
    for (const channel of channels) {
      channel.port1.close()
      channel.port2.close()
    }
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  function connect(source: Window | null = window, message = HTML_PREVIEW_CONNECT) {
    const channel = new MessageChannel()
    channels.push(channel)
    window.dispatchEvent(
      new MessageEvent("message", {
        source,
        data: message,
        ports: [channel.port2 as unknown as MessagePort],
      }),
    )
    return channel
  }

  it.each([null, "wrong message"])("ignores an invalid connection: %s", (invalid) => {
    if (invalid === null) connect(null)
    else connect(window, invalid)
    expect(document.querySelector("iframe")).toBeNull()
  })

  it.each(["request first", "frame first"])("passes HTML only into the declared sandbox: %s", async (order) => {
    const channel = connect()
    const frame = document.querySelector("iframe")
    assert(frame?.contentWindow)
    expect(frame.getAttribute("src")).toBe(HTML_SANDBOX_PAGE)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    const html = "<!doctype html><h1>日本語の mock</h1><script>window.mock = true</script>"
    const received = new Promise<void>((resolve) =>
      channel.port2.addEventListener("message", () => resolve(), { once: true }),
    )
    if (order === "frame first") frame.dispatchEvent(new Event("load"))
    channel.port1.postMessage({ type: "RENDER_HTML", html })
    if (order === "request first") {
      await received
      expect(post).not.toHaveBeenCalled()
      frame.dispatchEvent(new Event("load"))
    }
    await waitFor(() => expect(post).toHaveBeenCalledWith({ type: "RENDER_HTML", html }, "*"))
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

      const acknowledge = vi.spyOn(channel.port2, "postMessage")
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
      expect(acknowledge).toHaveBeenCalledWith({ type: HTML_PREVIEW_READY })
    } finally {
      sandbox.window.close()
    }
  })

  it("ignores requests for privileged operations and malformed HTML", async () => {
    const channel = connect()
    const frame = document.querySelector("iframe")
    assert(frame?.contentWindow)
    const post = vi.spyOn(frame.contentWindow, "postMessage").mockImplementation(() => {})
    frame.dispatchEvent(new Event("load"))
    channel.port1.postMessage({ type: "FETCH", url: "https://private.example" })
    channel.port1.postMessage({ type: "RENDER_HTML", html: { unsafe: true } })
    channel.port1.postMessage({ type: "RENDER_HTML", html: "<h1>Allowed mock</h1>" })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith({ type: "RENDER_HTML", html: "<h1>Allowed mock</h1>" }, "*")
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
          data: { type: "RENDER_HTML", html: invalid === "payload" ? 42 : "<h1>Mock</h1>" },
        }),
      )
      expect(sandbox.window.document.querySelector("iframe")).toBeNull()
    } finally {
      sandbox.window.close()
    }
  })
})
