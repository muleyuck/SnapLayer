import ImageUploader from "@/components/ImageUploader"
import type { SnapLayerMessage } from "@/types/messages"

const CONTENT_SCRIPT_PATH = "content.js"

const sendMessage = async (dataUrl: string) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab.id || !tab.url) {
    throw new Error("Not found Active Tab")
  }

  const message: SnapLayerMessage = { type: "ADD_IMAGE", imageData: dataUrl }

  try {
    await chrome.tabs.sendMessage(tab.id, message)
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [CONTENT_SCRIPT_PATH],
    })
    await chrome.tabs.sendMessage(tab.id, message)
  }

  window.close()
}

function App() {
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

export default App
