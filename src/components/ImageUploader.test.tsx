import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ImageUploader from "@/components/ImageUploader"

describe("ImageUploader", () => {
  const onImage = vi.fn()
  const onHtml = vi.fn()

  beforeEach(() => {
    onImage.mockReset()
  })

  it("should render file input and label", () => {
    render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

    expect(screen.getByText("Select image or HTML")).toBeInTheDocument()
    expect(screen.getByText("JPEG, PNG, SVG, HTML")).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  describe("file selection", () => {
    it.each([
      { name: "mock.html", type: "text/html" },
      { name: "mock.HTM", type: "" },
    ])("reads $name as HTML text without converting it to an image", async ({ name, type }) => {
      const onHtml = vi.fn().mockResolvedValue(undefined)
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)
      const html = "<!doctype html><h1>デザイン</h1><script>window.mock = true</script>"
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, "files", { value: [new File([html], name, { type })] })
      fireEvent.change(input)
      await waitFor(() => expect(onHtml).toHaveBeenCalledWith(html))
      expect(onImage).not.toHaveBeenCalled()
    })

    it("should call onImage with data URL for selected file", async () => {
      onImage.mockResolvedValue(undefined)
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })
      Object.defineProperty(input, "files", { value: [file] })

      fireEvent.change(input)

      await waitFor(() => {
        expect(onImage).toHaveBeenCalledWith(expect.stringContaining("data:"))
      })
    })

    it("should display error when no file is selected", async () => {
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, "files", { value: [] })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Can't get selected file")).toBeInTheDocument()
      })
    })

    it("should display error when onImage throws", async () => {
      onImage.mockRejectedValue(new Error("upload failed"))
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

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
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      fireEvent.paste(document, { clipboardData: { items: [] } })

      await waitFor(() => {
        expect(screen.getByText("Cant't get pasted item from clipboard")).toBeInTheDocument()
      })
    })

    it("should display error when getAsFile returns null for image", async () => {
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const clipboardData = {
        items: [{ type: "image/png", getAsFile: () => null }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Fail to convert pasted image to file")).toBeInTheDocument()
      })
    })

    it("should display error for unsupported clipboard item type", async () => {
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const clipboardData = {
        items: [{ type: "application/pdf", getAsFile: () => null }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Can't get pasted item, Only support (jpeg, png and svg)")).toBeInTheDocument()
      })
    })

    it("should display error when pasted text is empty", async () => {
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

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

    it("should call onImage for pasted image", async () => {
      onImage.mockResolvedValue(undefined)
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const file = new File(["test"], "test.png", { type: "image/png" })
      const clipboardData = {
        items: [{ type: "image/png", getAsFile: () => file }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(onImage).toHaveBeenCalledWith(expect.stringContaining("data:"))
      })
    })

    it("should call onImage for pasted SVG text", async () => {
      onImage.mockResolvedValue(undefined)
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const svgText = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
      const clipboardData = {
        items: [
          {
            type: "text/plain",
            getAsFile: () => null,
            getAsString: (callback: (s: string) => void) => callback(svgText),
          },
        ],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(onImage).toHaveBeenCalledWith(expect.stringContaining("data:image/svg+xml"))
      })
    })

    it("should reject non-SVG text", async () => {
      render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      const clipboardData = {
        items: [
          {
            type: "text/plain",
            getAsFile: () => null,
            getAsString: (callback: (s: string) => void) => callback("Hello World"),
          },
        ],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Pasted item as text/plain is only supported SVG")).toBeInTheDocument()
      })
    })
  })

  describe("cleanup", () => {
    it("should remove paste event listener on unmount", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener")
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener")

      const { unmount } = render(<ImageUploader onImage={onImage} onHtml={onHtml} />)

      expect(addEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function))
    })
  })
})
