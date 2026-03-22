import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Popup from "./Popup"

describe("Popup sendMessage", () => {
  beforeEach(() => {
    vi.mocked(chrome.tabs.query).mockReset()
    vi.mocked(chrome.tabs.sendMessage).mockReset()
    vi.mocked(chrome.scripting.executeScript).mockReset()
    vi.spyOn(window, "close").mockImplementation(() => {})
  })

  const uploadFile = () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["test"], "test.png", { type: "image/png" })
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
  }

  it("sends message directly when overlay is already injected (no executeScript)", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1, url: "https://example.com" } as chrome.tabs.Tab])
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue(undefined)

    render(<Popup />)
    uploadFile()

    await waitFor(() => {
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ type: "ADD_IMAGE", imageData: expect.stringContaining("data:") }),
      )
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
      expect(window.close).toHaveBeenCalled()
    })
  })

  it("injects script then sends message when overlay is not yet injected", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1, url: "https://example.com" } as chrome.tabs.Tab])
    vi.mocked(chrome.tabs.sendMessage)
      .mockRejectedValueOnce(new Error("Could not establish connection"))
      .mockResolvedValueOnce(undefined)
    vi.mocked(chrome.scripting.executeScript).mockResolvedValue([] as chrome.scripting.InjectionResult[])

    render(<Popup />)
    uploadFile()

    await waitFor(() => {
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({ target: { tabId: 1 }, files: expect.arrayContaining(["overlay.js"]) }),
      )
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(window.close).toHaveBeenCalled()
    })
  })

  it("displays error when no active tab is found", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([{} as chrome.tabs.Tab])

    render(<Popup />)
    uploadFile()

    await waitFor(() => {
      expect(screen.getByText("Not found Active Tab")).toBeInTheDocument()
      expect(window.close).not.toHaveBeenCalled()
    })
  })
})
