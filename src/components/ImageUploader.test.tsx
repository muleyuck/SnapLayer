import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ImageUploader from "@/components/ImageUploader"

const mockChrome = {
  tabs: {
    query: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
}

describe("ImageUploader", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", mockChrome)
    mockChrome.tabs.query.mockReset()
    mockChrome.scripting.executeScript.mockReset()
    vi.spyOn(window, "close").mockImplementation(() => {})
  })

  it("should render file input and label", () => {
    render(<ImageUploader />)

    expect(screen.getByText("Paste or Select image")).toBeInTheDocument()
    expect(screen.getByText("(jpeg, png and svg.)")).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  describe("file selection", () => {
    it("should convert selected file to data URL and send message", async () => {
      const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {})
      mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }])
      mockChrome.scripting.executeScript.mockResolvedValue([{ result: { success: true } }])

      render(<ImageUploader />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })

      Object.defineProperty(input, "files", {
        value: [file],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith(
          expect.objectContaining({
            target: { tabId: 1 },
            args: expect.arrayContaining([expect.stringContaining("data:")]),
          }),
        )
        expect(closeSpy).toHaveBeenCalled()
      })
    })

    it("should display error when no file is selected", async () => {
      render(<ImageUploader />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, "files", {
        value: [],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Cant't get selected image")).toBeInTheDocument()
      })
    })
  })

  describe("clipboard paste", () => {
    it("should display error when clipboard is empty", async () => {
      render(<ImageUploader />)

      fireEvent.paste(document, { clipboardData: { items: [] } })

      await waitFor(() => {
        expect(screen.getByText("Cant't get pasted item from clipboard")).toBeInTheDocument()
      })
    })

    it("should display error when getAsFile returns null for image", async () => {
      render(<ImageUploader />)

      const clipboardData = {
        items: [{ type: "image/png", getAsFile: () => null }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Fail to convert pasted image to file")).toBeInTheDocument()
      })
    })

    it("should display error for unsupported clipboard item type", async () => {
      render(<ImageUploader />)

      const clipboardData = {
        items: [{ type: "application/pdf", getAsFile: () => null }],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(screen.getByText("Can't get pasted item, Only support (jpeg, png and svg)")).toBeInTheDocument()
      })
    })

    it("should display error when pasted text is empty", async () => {
      render(<ImageUploader />)

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

    it("should handle pasted image from clipboard", async () => {
      const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {})
      mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }])
      mockChrome.scripting.executeScript.mockResolvedValue([{ result: { success: true } }])

      render(<ImageUploader />)

      const file = new File(["test"], "test.png", { type: "image/png" })
      const clipboardData = {
        items: [
          {
            type: "image/png",
            getAsFile: () => file,
          },
        ],
      }

      fireEvent.paste(document, { clipboardData })

      await waitFor(() => {
        expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith(
          expect.objectContaining({
            target: { tabId: 1 },
            args: expect.arrayContaining([expect.stringContaining("data:")]),
          }),
        )
        expect(closeSpy).toHaveBeenCalled()
      })
    })

    it("should handle pasted SVG text", async () => {
      mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }])
      mockChrome.scripting.executeScript.mockResolvedValue([{ result: { success: true } }])

      render(<ImageUploader />)

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
        expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith(
          expect.objectContaining({
            target: { tabId: 1 },
            args: expect.arrayContaining([expect.stringContaining("data:image/svg+xml")]),
          }),
        )
      })
    })

    it("should reject non-SVG text", async () => {
      render(<ImageUploader />)

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

  describe("error handling", () => {
    it("should display error when executeScript fails", async () => {
      mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }])
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: { success: false, error: "Failed to load module" } },
      ])

      render(<ImageUploader />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })

      Object.defineProperty(input, "files", {
        value: [file],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Failed to load module")).toBeInTheDocument()
      })
    })

    it("should display fallback error when executeScript returns no result", async () => {
      mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }])
      mockChrome.scripting.executeScript.mockResolvedValue([{ result: undefined }])

      render(<ImageUploader />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })

      Object.defineProperty(input, "files", {
        value: [file],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Failed to add image to page")).toBeInTheDocument()
      })
    })

    it("should display error when no active tab found", async () => {
      mockChrome.tabs.query.mockResolvedValue([{}])

      render(<ImageUploader />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })

      Object.defineProperty(input, "files", {
        value: [file],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Not found Active Tab")).toBeInTheDocument()
      })
    })

    it("should display error when tab has no URL", async () => {
      mockChrome.tabs.query.mockResolvedValue([{ id: 1 }])

      render(<ImageUploader />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["test"], "test.png", { type: "image/png" })

      Object.defineProperty(input, "files", {
        value: [file],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText("Not found Active Tab")).toBeInTheDocument()
      })
    })
  })

  describe("cleanup", () => {
    it("should remove paste event listener on unmount", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener")
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener")

      const { unmount } = render(<ImageUploader />)

      expect(addEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function))
    })
  })
})
