import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ImageUploader from "@/components/ImageUploader"

const textItem = (text: string, type = "text/plain") => ({
  type,
  getAsString: (callback: (text: string) => void) => callback(text),
})

describe("ImageUploader", () => {
  const onLoad = vi.fn()

  beforeEach(() => {
    onLoad.mockReset()
  })

  it("should render file input and label", () => {
    render(<ImageUploader onLoad={onLoad} />)

    expect(screen.getByText("Select image or HTML")).toBeInTheDocument()
    expect(screen.getByText("JPEG, PNG, SVG, HTML")).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  describe("file selection", () => {
    it.each([
      { name: "mock.html", type: "text/html" },
      { name: "mock.HTM", type: "" },
      { name: "mock", type: "text/html" },
    ])("reads $name as HTML text without converting it to an image", async ({ name, type }) => {
      const onLoad = vi.fn().mockResolvedValue(undefined)
      render(<ImageUploader onLoad={onLoad} />)
      const html = "<!doctype html><h1>デザイン</h1><script>window.mock = true</script>"
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, "files", { value: [new File([html], name, { type })] })
      fireEvent.change(input)
      await waitFor(() => expect(onLoad).toHaveBeenCalledWith({ kind: "html", html }))
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    it("should call onLoad with data URL for selected file", async () => {
      onLoad.mockResolvedValue(undefined)
      render(<ImageUploader onLoad={onLoad} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })
      Object.defineProperty(input, "files", { value: [file] })

      fireEvent.change(input)

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith({ kind: "image", dataUrl: expect.stringContaining("data:") })
      })
    })

    it("should display error when no file is selected", async () => {
      render(<ImageUploader onLoad={onLoad} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, "files", { value: [] })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Can't get selected file")).toBeInTheDocument()
      })
    })

    it("should display error when onLoad throws", async () => {
      onLoad.mockRejectedValue(new Error("upload failed"))
      render(<ImageUploader onLoad={onLoad} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })
      Object.defineProperty(input, "files", { value: [file] })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("upload failed")).toBeInTheDocument()
      })
    })
  })

  describe("clipboard paste", () => {
    it("should display error when clipboard is empty", async () => {
      render(<ImageUploader onLoad={onLoad} />)

      fireEvent.paste(document, { clipboardData: { items: [] } })

      await waitFor(() => {
        expect(screen.getByText("Cant't get pasted item from clipboard")).toBeInTheDocument()
      })
    })

    it("should display error when getAsFile returns null for image", async () => {
      render(<ImageUploader onLoad={onLoad} />)

      const clipboardData = {
        items: [{ type: "image/png", getAsFile: () => null }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Fail to convert pasted image to file")).toBeInTheDocument()
      })
    })

    it("should display error for unsupported clipboard item type", async () => {
      render(<ImageUploader onLoad={onLoad} />)

      const clipboardData = {
        items: [{ type: "application/pdf", getAsFile: () => null }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Paste an image, SVG source, or HTML source")).toBeInTheDocument()
      })
    })

    it("should display error when pasted text is empty", async () => {
      render(<ImageUploader onLoad={onLoad} />)

      const clipboardData = {
        items: [
          {
            type: "text/plain",
            getAsFile: () => null,
            getAsString: (callback: (s: string) => void) => callback("   "),
          },
        ],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Pasted item has no content")).toBeInTheDocument()
      })
    })

    it.each(["test.png", "mock.html"])("loads a pasted image named %s as an image", async (name) => {
      onLoad.mockResolvedValue(undefined)
      render(<ImageUploader onLoad={onLoad} />)

      const file = new File(["test"], name, { type: "image/png" })
      const clipboardData = {
        items: [{ type: "image/png", getAsFile: () => file }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith({ kind: "image", dataUrl: expect.stringContaining("data:") })
      })
    })

    it.each([false, true])("loads SVG source as an image with rich HTML present: %s", async (withRichHtml) => {
      onLoad.mockResolvedValue(undefined)
      render(<ImageUploader onLoad={onLoad} />)

      const svgText = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
      const clipboardData = {
        items: [...(withRichHtml ? [textItem("<div>Rich representation</div>", "text/html")] : []), textItem(svgText)],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith({ kind: "image", dataUrl: expect.stringContaining("data:image/svg+xml") })
      })
    })

    it.each(["<svg></svg>", "<svg/>", '<svg\nxmlns="http://www.w3.org/2000/svg"/>'])(
      "loads SVG source at a tag-name boundary: %s",
      async (text) => {
        render(<ImageUploader onLoad={onLoad} />)
        fireEvent.paste(document, { clipboardData: { items: [textItem(text)] } })

        await waitFor(() =>
          expect(onLoad).toHaveBeenCalledWith({
            kind: "image",
            dataUrl: expect.stringContaining("data:image/svg+xml"),
          }),
        )
      },
    )

    it.each([
      "<!doctype html><html><body>Document</body></html>",
      ' \n<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"><p>Legacy document</p>\n ',
      "<html><body>No doctype</body></html>",
      "<head><style>body { color: red }</style></head><body>Mockup</body>",
      "<body>Body fragment</body>",
      " \n<SECTION class='mockup'>デザイン</SECTION>\n ",
      "<img src='https://example.com/mockup.png'>",
      "<script>throw new Error('must not run in popup')</script><p>Mockup</p>",
    ])("loads HTML source unchanged: %s", async (html) => {
      render(<ImageUploader onLoad={onLoad} />)
      fireEvent.paste(document, { clipboardData: { items: [textItem(html)] } })

      await waitFor(() => expect(onLoad).toHaveBeenCalledWith({ kind: "html", html }))
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    it.each([false, true])("uses plain HTML source with rich HTML first: %s", async (richFirst) => {
      render(<ImageUploader onLoad={onLoad} />)
      const html = "<div>Plain source</div>"
      const items = [textItem(html), textItem("<p>Different rich HTML</p>", "text/html")]
      fireEvent.paste(document, { clipboardData: { items: richFirst ? items.reverse() : items } })

      await waitFor(() => expect(onLoad).toHaveBeenCalledWith({ kind: "html", html }))
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    it.each([
      "Hello World",
      "Use <div> for a container",
      "<unknown>Placeholder</unknown>",
      "<mock-card>Custom element</mock-card>",
      "<svg-card>Mock</svg-card>",
      "<svgish>text</svgish>",
      "<svg",
      "<divergent>Not a div</divergent>",
      "<div",
      "<!doctype htmlish><p>Not an HTML doctype</p>",
      "&lt;div&gt;Escaped source&lt;/div&gt;",
    ])("rejects unsupported text without loading a layer: %s", async (text) => {
      render(<ImageUploader onLoad={onLoad} />)
      fireEvent.paste(document, { clipboardData: { items: [textItem(text)] } })

      await waitFor(() => expect(screen.getByText("Paste an image, SVG source, or HTML source")).toBeInTheDocument())
      expect(onLoad).not.toHaveBeenCalled()
    })

    it.each([false, true])("rejects rich HTML with ordinary plain text present: %s", async (withPlainText) => {
      render(<ImageUploader onLoad={onLoad} />)
      fireEvent.paste(document, {
        clipboardData: {
          items: [textItem("<div>Copied page</div>", "text/html"), ...(withPlainText ? [textItem("Copied page")] : [])],
        },
      })

      await waitFor(() => expect(screen.getByText("Paste an image, SVG source, or HTML source")).toBeInTheDocument())
      expect(onLoad).not.toHaveBeenCalled()
    })

    it("keeps image data ahead of accompanying text representations", async () => {
      render(<ImageUploader onLoad={onLoad} />)
      const image = new File(["image bytes"], "mock.png", { type: "image/png" })
      fireEvent.paste(document, {
        clipboardData: { items: [textItem("<p>Image caption</p>"), { type: "image/png", getAsFile: () => image }] },
      })
      await waitFor(() =>
        expect(onLoad).toHaveBeenCalledWith({ kind: "image", dataUrl: expect.stringContaining("data:image/png") }),
      )
    })
  })

  describe("cleanup", () => {
    it("should remove paste event listener on unmount", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener")
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener")

      const { unmount } = render(<ImageUploader onLoad={onLoad} />)

      expect(addEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function))
    })
  })
})
