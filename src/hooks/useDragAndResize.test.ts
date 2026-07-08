import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ImageOverlayState } from "@/hooks/imageOverlayReducer"
import { useDragAndResize } from "@/hooks/useDragAndResize"

const createMockState = (overrides: Partial<ImageOverlayState> = {}): ImageOverlayState => ({
  position: { x: 100, y: 100 },
  size: { width: 200, height: 100 },
  aspectRatio: 2,
  lockAspectRatio: true,
  opacity: 100,
  isVisibleImage: true,
  ...overrides,
})

describe("useDragAndResize", () => {
  describe("initial state", () => {
    it("should initialize with isDragging and isResizing as false/null", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      expect(result.current.isDragging).toBe(false)
      expect(result.current.isResizing).toBeNull()
    })
  })

  describe("drag start/end", () => {
    it("should set isDragging to true on drag start", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        target: document.createElement("div"),
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleDragStart(mockEvent)
      })

      expect(result.current.isDragging).toBe(true)
    })

    it("should set isDragging to false on pointer up", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        target: document.createElement("div"),
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleDragStart(mockEvent)
      })

      expect(result.current.isDragging).toBe(true)

      act(() => {
        document.dispatchEvent(new PointerEvent("pointerup"))
      })

      expect(result.current.isDragging).toBe(false)
    })
  })

  describe("drag position calculation", () => {
    it("should dispatch SET_POSITION with calculated dx and dy during drag", () => {
      const dispatch = vi.fn()
      const state = createMockState({ position: { x: 100, y: 100 } })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        target: document.createElement("div"),
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleDragStart(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 250 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 150, y: 200 },
      })
    })

    it("should not dispatch when not dragging", () => {
      const dispatch = vi.fn()
      renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 200 }))
      })

      expect(dispatch).not.toHaveBeenCalled()
    })
  })

  describe("resize directions", () => {
    it("should set isResizing to direction on resize start", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 200,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("right")(mockEvent)
      })

      expect(result.current.isResizing).toBe("right")
    })

    it("should clear isResizing on pointer up", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 200,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("right")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointerup"))
      })

      expect(result.current.isResizing).toBeNull()
    })

    it("should dispatch SET_SIZE when resizing from right", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        size: { width: 200, height: 100 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 300,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("right")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 350, clientY: 150 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_SIZE",
        payload: { width: 250, height: 100 },
      })
    })

    it("should resize from left and adjust position", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 100,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("left")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 150 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_SIZE",
        payload: { width: 250, height: 100 },
      })
      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 50, y: 100 },
      })
    })

    it("should resize from top and adjust position", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 200,
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("top")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 50 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_SIZE",
        payload: { width: 200, height: 150 },
      })
      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 100, y: 50 },
      })
    })

    it("should resize diagonally from bottom_right", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        size: { width: 200, height: 100 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 300,
        clientY: 200,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("bottom_right")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 350, clientY: 250 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_SIZE",
        payload: { width: 250, height: 150 },
      })
    })

    it("should resize diagonally from top_left and adjust position", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("top_left")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 50 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_SIZE",
        payload: { width: 250, height: 150 },
      })
      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 50, y: 50 },
      })
    })
  })

  describe("minimum size enforcement", () => {
    it("should apply minimum size of 10px", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        size: { width: 50, height: 50 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("right")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 150 }))
      })

      const setSizeCall = dispatch.mock.calls.find((call) => call[0].type === "SET_SIZE")
      expect(setSizeCall?.[0].payload.width).toBeGreaterThanOrEqual(10)
    })

    it("should clamp position when left resize hits minimum width", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 100,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("left")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 150 }))
      })

      const setSizeCall = dispatch.mock.calls.find((call) => call[0].type === "SET_SIZE")
      expect(setSizeCall?.[0].payload.width).toBe(10)
    })
  })

  describe("aspect ratio lock", () => {
    it("should maintain aspect ratio when lockAspectRatio is true (horizontal resize)", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        size: { width: 200, height: 100 },
        aspectRatio: 2,
        lockAspectRatio: true,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 300,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("right")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 400, clientY: 150 }))
      })

      const setSizeCall = dispatch.mock.calls.find((call) => call[0].type === "SET_SIZE")
      expect(setSizeCall?.[0].payload.width).toBe(300)
      expect(setSizeCall?.[0].payload.height).toBe(150)
    })

    it("should adjust width based on height when resizing vertically with locked aspect ratio", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        size: { width: 200, height: 100 },
        aspectRatio: 2,
        lockAspectRatio: true,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 200,
        clientY: 200,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("bottom")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 250 }))
      })

      const setSizeCall = dispatch.mock.calls.find((call) => call[0].type === "SET_SIZE")
      expect(setSizeCall?.[0].payload.height).toBe(150)
      expect(setSizeCall?.[0].payload.width).toBe(300)
    })

    it("should adjust position when resizing from top with locked aspect ratio", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        aspectRatio: 2,
        lockAspectRatio: true,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 200,
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("top")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 50 }))
      })

      const setSizeCall = dispatch.mock.calls.find((call) => call[0].type === "SET_SIZE")
      const setPositionCall = dispatch.mock.calls.find((call) => call[0].type === "SET_POSITION")

      expect(setSizeCall?.[0].payload.height).toBe(150)
      expect(setSizeCall?.[0].payload.width).toBe(300)
      expect(setPositionCall?.[0].payload.y).toBe(50)
    })

    it("should not maintain aspect ratio when lockAspectRatio is false", () => {
      const dispatch = vi.fn()
      const state = createMockState({
        size: { width: 200, height: 100 },
        aspectRatio: 2,
        lockAspectRatio: false,
      })
      const { result } = renderHook(() =>
        useDragAndResize({
          state,
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 300,
        clientY: 150,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleResizeStart("right")(mockEvent)
      })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 400, clientY: 150 }))
      })

      const setSizeCall = dispatch.mock.calls.find((call) => call[0].type === "SET_SIZE")
      expect(setSizeCall?.[0].payload.width).toBe(300)
      expect(setSizeCall?.[0].payload.height).toBe(100)
    })
  })

  describe("snap guides", () => {
    // Common fixture for every case below: drag starts at (150, 150) from position (100, 100), size 200x100.
    function startSnapDrag() {
      const dispatch = vi.fn()
      const { result } = renderHook(() => useDragAndResize({ state: createMockState(), dispatch }))

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        target: document.createElement("div"),
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleDragStart(mockEvent)
      })

      return { dispatch, result }
    }

    it("should not snap while Ctrl is held, even within the snap threshold", () => {
      const { dispatch, result } = startSnapDrag()

      // Same delta as the left-edge snap test (newX would be 3, within 8px of 0) but with Ctrl held
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 53, clientY: 150, ctrlKey: true }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 3, y: 100 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: null })
    })

    it("should not snap while Meta (Cmd) is held, even within the snap threshold", () => {
      const { dispatch, result } = startSnapDrag()

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 53, clientY: 150, metaKey: true }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 3, y: 100 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: null })
    })

    it("should snap to the left edge and expose a vertical guide at x=0", () => {
      const { dispatch, result } = startSnapDrag()

      // dx = 53 - 150 = -97 -> newX = 100 - 97 = 3 (within 8px of 0)
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 53, clientY: 150 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 0, y: 100 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: 0, horizontal: null })
    })

    it("should snap to the top edge and expose a horizontal guide at y=0", () => {
      const { dispatch, result } = startSnapDrag()

      // dy = 53 - 150 = -97 -> newY = 100 - 97 = 3 (within 8px of 0); dx = 0 -> newX stays 100 (no x snap target nearby)
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 53 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 100, y: 0 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: 0 })
    })

    it("should snap to the right edge and expose a vertical guide at the viewport width", () => {
      const { dispatch, result } = startSnapDrag()

      // viewport is 1024x768 (jsdom default), width 200 -> right edge target x = 824
      // dx = 872 - 150 = 722 -> newX = 100 + 722 = 822 (within 8px of 824); dy = 0 -> newY stays 100
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 872, clientY: 150 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 824, y: 100 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: 1024, horizontal: null })
    })

    it("should snap to the bottom edge and expose a horizontal guide at the viewport height", () => {
      const { dispatch, result } = startSnapDrag()

      // viewport is 1024x768 (jsdom default), height 100 -> bottom edge target y = 668
      // dy = 716 - 150 = 566 -> newY = 100 + 566 = 666 (within 8px of 668); dx = 0 -> newX stays 100
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 716 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 100, y: 668 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: 768 })
    })

    it("should snap to the vertical center of the viewport", () => {
      const { dispatch, result } = startSnapDrag()

      // viewport is 1024x768 (jsdom default), height 100 -> center y = 334
      // dy = 382 - 150 = 232 -> newY = 100 + 232 = 332 (within 8px of 334); dx = 0 -> newX stays 100
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 382 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 100, y: 334 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: 384 })
    })

    it("should snap to the horizontal center of the viewport", () => {
      const { dispatch, result } = startSnapDrag()

      // viewport is 1024x768 (jsdom default), width 200 -> center x = 412
      // dx = 460 - 150 = 310 -> newX = 100 + 310 = 410 (within 8px of 412)
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 460, clientY: 150 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 412, y: 100 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: 512, horizontal: null })
    })

    it("should not snap when outside the threshold", () => {
      const { dispatch, result } = startSnapDrag()

      // dx = 200 - 150 = 50 -> newX = 100 + 50 = 150 (not near any snap target)
      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 150 }))
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_POSITION",
        payload: { x: 150, y: 100 },
      })
      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: null })
    })

    it("should reset snapGuides to null after pointer up", () => {
      const { result } = startSnapDrag()

      act(() => {
        document.dispatchEvent(new PointerEvent("pointermove", { clientX: 53, clientY: 150 }))
      })

      expect(result.current.snapGuides).toEqual({ vertical: 0, horizontal: null })

      act(() => {
        document.dispatchEvent(new PointerEvent("pointerup"))
      })

      expect(result.current.snapGuides).toEqual({ vertical: null, horizontal: null })
    })
  })

  describe("skip drag on specific elements", () => {
    it("should not start drag on INPUT elements", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        target: document.createElement("input"),
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleDragStart(mockEvent)
      })

      expect(result.current.isDragging).toBe(false)
    })

    it("should start drag on draggable elements like DIV", () => {
      const dispatch = vi.fn()
      const { result } = renderHook(() =>
        useDragAndResize({
          state: createMockState(),
          dispatch,
        }),
      )

      const mockEvent = {
        clientX: 150,
        clientY: 150,
        target: document.createElement("div"),
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent

      act(() => {
        result.current.handleDragStart(mockEvent)
      })

      expect(result.current.isDragging).toBe(true)
    })
  })
})
