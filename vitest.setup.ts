import "@testing-library/jest-dom/vitest"
import { beforeAll, beforeEach, vi } from "vitest"

// Chrome API mock
// Use beforeAll to ensure chrome is stubbed before any test runs
const chromeMock = {
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://snaplayer-test/${path}`),
    sendMessage: vi.fn(() => new Promise(() => {})),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
}

beforeAll(() => {
  vi.stubGlobal("chrome", chromeMock)
})

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

// jsdom does not implement element layout observation.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  },
)

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
