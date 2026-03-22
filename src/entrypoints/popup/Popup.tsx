import ImageUploader from "@/components/ImageUploader"
import type { SnapLayerMessage } from "@/types/messages"

// "overlay.js" corresponds to src/entrypoints/overlay.ts, which WXT uses as the output filename.
const CONTENT_SCRIPT_PATH = "overlay.js"

const sendMessage = async (dataUrl: string) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.id || !tab.url) {
    throw new Error("Not found Active Tab")
  }

  const message: SnapLayerMessage = { type: "ADD_IMAGE", imageData: dataUrl }

  try {
    // If overlay is already injected, send message directly
    await chrome.tabs.sendMessage(tab.id, message)
  } catch {
    // Not yet injected — inject script then resend
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [CONTENT_SCRIPT_PATH],
    })
    await chrome.tabs.sendMessage(tab.id, message)
  }

  // Close popup after successful upload (not in finally — errors should not close the popup)
  window.close()
}

function Popup() {
  return (
    <div className="w-64 space-y-4 px-4 py-2 dark:bg-slate-800 dark:text-white">
      <h2 className="block w-48 dark:hidden">
        <img src="/logo-light.svg" alt="SnapLayer Logo Light" />
      </h2>
      <h2 className="hidden w-48 dark:block">
        <img src="/logo-dark.svg" alt="SnapLayer Logo Dark" />
      </h2>
      <ImageUploader onImage={sendMessage} />
    </div>
  )
}

export default Popup
