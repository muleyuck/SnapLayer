import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync } from "node:fs"
import { createServer } from "node:http"
import { homedir, tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { createBuilder } from "vite"

const extensionDir = realpathSync(mkdtempSync(join(tmpdir(), "snaplayer-security-extension-")))
const profileDir = mkdtempSync(join(tmpdir(), "snaplayer-security-profile-"))
const runId = randomUUID()
const reports = []
let browser
let browserError = ""
let connection

function receiver() {
  const run = new URL(location.href).searchParams.get("run")
  addEventListener("message", (event) => {
    if (event.data?.type === "RENDER_HTML" && typeof event.data.html === "string") {
      top.postMessage({ securityRun: run, kind: "leaked", html: event.data.html }, location.origin)
    }
  })
  top.postMessage({ securityRun: run, kind: "receiver-ready" }, location.origin)
}

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1")
  if (request.method !== "GET" || !["/", "/receiver"].includes(url.pathname)) {
    response.writeHead(404).end()
    return
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8")
  response.setHeader("Cache-Control", "no-store")
  response.end(
    url.pathname === "/"
      ? '<!doctype html><title>SnapLayer security check</title><p id="private-page-data">Comparison page data</p>'
      : `<!doctype html><title>Replacement frame</title><script>(${receiver.toString()})()</script>`,
  )
})

async function until(check, description, timeout = 5000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const result = await check()
    if (result) return result
    await delay(25)
  }
  throw new Error(`Timed out: ${description}`)
}

async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true })
    socket.addEventListener("error", reject, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      clearTimeout(request.timer)
      if (message.error) request.reject(new Error(JSON.stringify(message.error)))
      else request.resolve(message.result)
    } else {
      for (const listener of listeners.get(message.method) ?? []) listener(message)
    }
  })
  return {
    send(method, params = {}, sessionId) {
      const id = ++nextId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`CDP command timed out: ${method}`))
        }, 10000)
        pending.set(id, { resolve, reject, timer })
        socket.send(JSON.stringify({ id, method, params, sessionId }))
      })
    },
    on(method, listener) {
      const set = listeners.get(method) ?? new Set()
      set.add(listener)
      listeners.set(method, set)
      return () => set.delete(listener)
    },
    close() {
      socket.close()
      for (const request of pending.values()) {
        clearTimeout(request.timer)
        request.reject(new Error("Browser connection closed"))
      }
      pending.clear()
    },
  }
}

async function evaluate(sessionId, expression, contextId) {
  const result = await connection.send(
    "Runtime.evaluate",
    { expression, contextId, awaitPromise: true, returnByValue: true },
    sessionId,
  )
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  }
  return result.result.value
}

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  if (process.platform === "darwin") {
    const cache = join(homedir(), "Library/Caches/ms-playwright")
    if (existsSync(cache)) {
      for (const directory of readdirSync(cache).sort().reverse()) {
        if (!/^chromium-\d+$/.test(directory)) continue
        const binary = join(
          cache,
          directory,
          `chrome-mac-${process.arch === "arm64" ? "arm64" : "x64"}`,
          "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        )
        if (existsSync(binary)) return binary
      }
    }
  }
  throw new Error("Set CHROME_PATH to a Chrome for Testing or Chromium executable (unpacked extensions required).")
}

function isolationProbe(origin, run) {
  const blocked = (access) => {
    try {
      access()
      return false
    } catch (error) {
      return error.name === "SecurityError"
    }
  }
  top.postMessage(
    {
      securityRun: run,
      kind: "isolation",
      checks: {
        "comparison DOM": blocked(() => top.document.body),
        "comparison cookies": blocked(() => top.document.cookie),
        "sandbox DOM": blocked(() => parent.document.body),
        "extension DOM": blocked(() => parent.parent.document.body),
        "own cookies": blocked(() => document.cookie),
        "extension API": typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function",
      },
    },
    origin,
  )
}

async function main() {
  const builder = await createBuilder({
    environments: { client: { build: { outDir: extensionDir } }, content: { build: { outDir: extensionDir } } },
  })
  await builder.buildApp()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  const extensionId = createHash("sha256")
    .update(extensionDir)
    .digest("hex")
    .slice(0, 32)
    .replace(/[0-9a-f]/g, (character) => String.fromCharCode(97 + Number.parseInt(character, 16)))
  const previewUrl = `chrome-extension://${extensionId}/html-preview.html`
  browser = spawn(findBrowser(), [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    `--user-data-dir=${profileDir}`,
    "--remote-debugging-port=0",
    `--load-extension=${extensionDir}`,
    "about:blank",
  ])
  browser.stderr.on("data", (chunk) => {
    browserError = (browserError + chunk).slice(-10000)
  })
  let launchError
  browser.on("error", (error) => {
    launchError = error
  })
  const portFile = join(profileDir, "DevToolsActivePort")
  await until(
    () => {
      if (launchError) throw launchError
      if (browser.exitCode !== null || browser.signalCode !== null) {
        throw new Error(`Browser exited: ${browser.exitCode ?? browser.signalCode}\n${browserError}`)
      }
      return existsSync(portFile)
    },
    "browser startup",
    10000,
  )
  const [port, debuggerPath] = readFileSync(portFile, "utf8").trim().split("\n")
  connection = await connect(`ws://127.0.0.1:${port}${debuggerPath}`)
  const version = await connection.send("Browser.getVersion")
  console.log(`Browser: ${version.product}`)
  await connection.send("Target.setDiscoverTargets", { discover: true })
  const { targetId } = await connection.send("Target.createTarget", { url: origin })
  const { sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true })
  await connection.send("Page.enable", {}, sessionId)
  await connection.send("Runtime.enable", {}, sessionId)
  await until(() => evaluate(sessionId, `location.href === ${JSON.stringify(`${origin}/`)}`), "comparison page")
  const { frameTree } = await connection.send("Page.getFrameTree", {}, sessionId)
  const { executionContextId } = await connection.send(
    "Page.createIsolatedWorld",
    { frameId: frameTree.frame.id, worldName: "snaplayer-security-driver" },
    sessionId,
  )
  const run = (expression) => evaluate(sessionId, expression, executionContextId)
  await run(`globalThis.results = []; addEventListener("message", event => {
    if (event.isTrusted && event.data?.securityRun === ${JSON.stringify(runId)}) results.push(event.data);
  }); document.cookie = "snaplayer_security=page-only";`)

  async function createPreview() {
    await run('document.getElementById("preview")?.remove()')
    await until(async () => {
      const { targetInfos } = await connection.send("Target.getTargets")
      return !targetInfos.some((target) => target.type === "iframe" && target.url === previewUrl)
    }, "previous preview removal")
    await run(`(() => {
      globalThis.results = [];
      const frame = document.createElement("iframe");
      frame.id = "preview";
      frame.src = ${JSON.stringify(previewUrl)};
      document.body.appendChild(frame);
    })()`)
    const target = await until(async () => {
      const { targetInfos } = await connection.send("Target.getTargets")
      return targetInfos.find((target) => target.type === "iframe" && target.url === previewUrl)
    }, "extension preview target (Chrome for Testing must load the unpacked extension)")
    const attached = await connection.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
    await connection.send("Runtime.enable", {}, attached.sessionId)
    await until(() => evaluate(attached.sessionId, 'document.readyState === "complete"'), "extension preview document")
    return attached.sessionId
  }

  async function render(html) {
    await run(`document.getElementById("preview").contentWindow.postMessage(
      ${JSON.stringify({ type: "RENDER_HTML", html, requestId: randomUUID() })},
      ${JSON.stringify(`chrome-extension://${extensionId}`)});`)
  }

  async function check(name, check) {
    try {
      await check()
      reports.push({ name, result: "PASS" })
      console.log(`PASS ${name}`)
    } catch (error) {
      const result = error.code === "ERR_ASSERTION" ? "FAIL" : "ERROR"
      reports.push({ name, result, error: error.message })
      console.error(`${result} ${name}: ${error.message}`)
    }
  }

  await check("uploaded HTML cannot read comparison or extension data", async () => {
    await createPreview()
    await render(
      `<!doctype html><script>(${isolationProbe.toString()})(${JSON.stringify(origin)},${JSON.stringify(runId)})</script>`,
    )
    const result = await until(() => run('results.find(result => result.kind === "isolation")'), "uploaded script")
    for (const [name, blocked] of Object.entries(result.checks)) assert.equal(blocked, true, name)
    console.log(JSON.stringify(result.checks))
  })

  for (const destination of ["http", "about:blank"]) {
    await check(`HTML remains private when the sandbox navigates to ${destination}`, async () => {
      const extensionSession = await createPreview()
      await connection.send("Debugger.enable", {}, extensionSession)
      await connection.send("DOMDebugger.setEventListenerBreakpoint", { eventName: "load" }, extensionSession)
      let paused = false
      const removeListener = connection.on("Debugger.paused", (event) => {
        if (event.sessionId === extensionSession) paused = true
      })
      try {
        await evaluate(
          extensionSession,
          `globalThis.violations = [];
          addEventListener("securitypolicyviolation", event => violations.push({directive:event.effectiveDirective, uri:event.blockedURI}));`,
        )
        const marker = `private-mock-${randomUUID()}`
        await render(`<!doctype html><p>${marker}</p>`)
        await until(() => paused, "pause before forwarding HTML")
        await connection.send("DOMDebugger.removeEventListenerBreakpoint", { eventName: "load" }, extensionSession)
        async function blankNavigation() {
          const tree = await connection.send("Page.getFrameTree", {}, extensionSession)
          const { targetInfos } = await connection.send("Target.getTargets")
          const targets = targetInfos.filter((target) => target.type === "iframe")
          // The frame tree omits children rendered in another process; those have separate targets.
          return {
            landed:
              tree.frameTree.childFrames?.[0]?.frame.url === "about:blank" ||
              targets.some((target) => target.url === "about:blank"),
            frameTree: tree.frameTree,
            targets: targets.map(({ targetId, url }) => ({ targetId, url })),
          }
        }
        let replacementReady = false
        if (destination === "http") {
          await run(
            `document.getElementById("preview").contentWindow[0].location = ${JSON.stringify(`${origin}/receiver?run=${runId}`)};`,
          )
          try {
            await until(
              () => run('results.some(result => result.kind === "receiver-ready")'),
              "replacement frame",
              1000,
            )
            replacementReady = true
          } catch {
            // A blocked navigation is verified below, rather than counted as a passing timeout.
          }
        } else {
          await run('document.getElementById("preview").contentWindow[0].location = "about:blank";')
          let navigation
          try {
            await until(async () => {
              navigation = await run(`(() => {
                try { return {url:document.getElementById("preview").contentWindow[0].location.href}; }
                catch (error) { return {error:error.name}; }
              })()`)
              if (navigation.url === "about:blank") return true
              navigation.details = await blankNavigation()
              return navigation.details.landed
            }, "about:blank navigation")
          } catch (error) {
            throw new Error(`${error.message}; observed ${JSON.stringify(navigation)}`)
          }
          replacementReady = await run(`(() => {
            const target = document.getElementById("preview").contentWindow[0];
            try {
              target.addEventListener("message", event => {
                if (event.data?.type === "RENDER_HTML") results.push({kind:"leaked",html:event.data.html});
              });
              return true;
            } catch (error) {
              if (error.name !== "SecurityError") throw error;
              return false;
            }
          })()`)
        }
        await connection.send("Debugger.resume", {}, extensionSession)
        paused = false
        if (replacementReady) {
          await until(
            () =>
              run(
                `results.some(result => result.kind === "leaked" && result.html.includes(${JSON.stringify(marker)}))`,
              ),
            "private HTML transfer to the replacement document",
          )
          assert.fail("the replacement document received the private HTML")
        }
        if (destination === "http") {
          await until(async () => {
            const violations = await evaluate(extensionSession, "violations")
            return violations.some((event) => event.directive === "frame-src" && event.uri.startsWith(origin))
          }, "CSP evidence that the replacement navigation was blocked")
        } else {
          assert.equal(replacementReady, false, "the comparison page could install a listener in about:blank")
          assert.equal((await blankNavigation()).landed, true, "about:blank navigation was not exercised")
        }
      } finally {
        await connection.send("DOMDebugger.removeEventListenerBreakpoint", { eventName: "load" }, extensionSession)
        if (paused) await connection.send("Debugger.resume", {}, extensionSession)
        removeListener()
        await connection.send("Debugger.disable", {}, extensionSession)
      }
    })
  }
  console.log(JSON.stringify({ browser: version.product, reports }, null, 2))
  if (reports.some((report) => report.result !== "PASS")) process.exitCode = 1
}

try {
  await main()
} catch (error) {
  console.error(`Security verification did not complete: ${error.message}`)
  process.exitCode = 1
} finally {
  connection?.close()
  browser?.kill("SIGTERM")
  server.close()
  console.log(`Test extension: ${resolve(extensionDir)}`)
}
