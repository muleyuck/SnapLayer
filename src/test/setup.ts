import "@testing-library/jest-dom/vitest"
import { beforeEach, vi } from "vitest"

// Chrome API mock
const chromeMock = {
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
}

vi.stubGlobal("chrome", chromeMock)

// Mock Image constructor (jsdom doesn't fire onload for data URLs)
class MockImage {
  src = ""
  naturalWidth = 400
  naturalHeight = 300
  onload: (() => void) | null = null

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
}

vi.stubGlobal("Image", MockImage)

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
