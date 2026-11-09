import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ImageOverlay } from "@/components/ImageOverlay"

const layerSources = [
  { name: "PNG", source: { kind: "image", dataUrl: "data:image/png;base64,test" } },
  {
    name: "SVG",
    source: {
      kind: "image",
      dataUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg"/>')}`,
    },
  },
  { name: "HTML", source: { kind: "html", html: "<h1>Mock</h1>" } },
] as const

describe("ImageOverlay", () => {
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    mockOnDelete.mockReset()
  })

  describe("toolbar movement", () => {
    it.each(layerSources)("moves a $name layer from the toolbar background without a dedicated grip", ({ source }) => {
      render(<ImageOverlay source={source} onDelete={mockOnDelete} />)
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      expect(screen.queryByRole("button", { name: "Move layer" })).not.toBeInTheDocument()
      const handle = screen.getByRole("toolbar", { name: "Layer controls" })
      fireEvent.pointerDown(handle, { clientX: 140, clientY: 160 })
      expect(layer).toHaveClass("cursor-grabbing")
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(layer).toHaveStyle({ left: "177px", top: "163px" })
      fireEvent.pointerUp(document)
      expect(layer).not.toHaveClass("cursor-grabbing")
      fireEvent.pointerMove(document, { clientX: 260, clientY: 280 })
      expect(layer).toHaveStyle({ left: "177px", top: "163px" })
    })

    it.each(layerSources)(
      "activates a $name layer through the toolbar background before handling Delete",
      ({ source }) => {
        render(<ImageOverlay source={source} onDelete={mockOnDelete} />)
        const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
        const frame = screen.queryByTitle("HTML preview")
        if (frame) (frame as HTMLIFrameElement).focus()
        fireEvent.pointerDown(screen.getByRole("toolbar", { name: "Layer controls" }), { clientX: 140, clientY: 160 })
        fireEvent.pointerUp(document)
        expect(layer).toHaveFocus()
        fireEvent.keyDown(document.activeElement as Element, { key: "Delete" })
        expect(mockOnDelete).toHaveBeenCalledTimes(1)
      },
    )

    it.each(layerSources)("activates a $name layer when its resize handle is selected", ({ source }) => {
      render(<ImageOverlay source={source} onDelete={mockOnDelete} />)
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      const frame = screen.queryByTitle("HTML preview")
      if (frame) (frame as HTMLIFrameElement).focus()
      fireEvent.pointerDown(screen.getByRole("button", { name: "Resize from right" }), { clientX: 140, clientY: 160 })
      fireEvent.pointerUp(document)
      expect(layer).toHaveFocus()
      fireEvent.keyDown(document.activeElement as Element, { key: "Delete" })
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it("leaves page keyboard operations alone while the layer is inactive", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      const input = document.createElement("input")
      document.body.appendChild(input)
      try {
        input.focus()
        fireEvent.keyDown(input, { key: "Delete" })
        fireEvent.keyDown(input, { key: "ArrowRight" })
        expect(mockOnDelete).not.toHaveBeenCalled()
        expect(layer).toHaveStyle({ left: "100px", top: "100px" })
      } finally {
        input.remove()
      }
    })

    it.each(["button", "svg", "path", "input", "slider"])("does not start moving from a toolbar %s", (kind) => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      const button = screen.getByRole("button", { name: "Collapse toolbar" })
      const target =
        kind === "input"
          ? screen.getByRole("spinbutton", { name: "Width (px)" })
          : kind === "slider"
            ? screen.getByRole("slider", { name: "Opacity" })
            : kind === "button"
              ? button
              : button.querySelector(kind)
      expect(target).not.toBeNull()
      fireEvent.pointerDown(target as Element, { clientX: 140, clientY: 160 })
      expect(layer).not.toHaveClass("cursor-grabbing")
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(layer).toHaveStyle({ left: "100px", top: "100px" })
      expect(screen.getByTitle("HTML preview")).toHaveStyle({ pointerEvents: "auto" })
      fireEvent.pointerUp(document)
    })

    it("moves from a decorative toolbar label", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      fireEvent.pointerDown(screen.getByText("Opacity"), { clientX: 140, clientY: 160 })
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(screen.getByRole("group", { name: "Draggable layer overlay" })).toHaveStyle({
        left: "177px",
        top: "163px",
      })
      fireEvent.pointerUp(document)
    })

    it("keeps the HTML document mounted and restores interaction after a move", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const frame = screen.getByTitle("HTML preview")
      fireEvent.pointerDown(screen.getByRole("toolbar", { name: "Layer controls" }), { clientX: 140, clientY: 160 })
      expect(frame).toHaveStyle({ pointerEvents: "none" })
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(screen.getByTitle("HTML preview")).toBe(frame)
      fireEvent.pointerUp(document)
      expect(frame).toHaveStyle({ pointerEvents: "auto" })
    })

    it("keeps the toolbar background draggable when collapsed", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      fireEvent.click(screen.getByRole("button", { name: "Collapse toolbar" }))
      fireEvent.pointerDown(screen.getByRole("toolbar", { name: "Layer controls" }), { clientX: 140, clientY: 160 })
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(screen.getByRole("group", { name: "Draggable layer overlay" })).toHaveStyle({
        left: "177px",
        top: "163px",
      })
      fireEvent.pointerUp(document)
    })
  })

  describe("shared move edges", () => {
    it.each(layerSources.flatMap((source) => ["top", "right", "bottom", "left"].map((edge) => ({ ...source, edge }))))(
      "moves $name from its $edge edge without changing its size",
      ({ source, edge }) => {
        render(<ImageOverlay source={source} onDelete={mockOnDelete} />)
        const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
        const initialSize = { width: layer.style.width, height: layer.style.height }
        const frame = screen.queryByTitle("HTML preview")
        if (frame) (frame as HTMLIFrameElement).focus()
        fireEvent.pointerDown(screen.getByRole("button", { name: `Move from ${edge} edge` }), {
          clientX: 140,
          clientY: 160,
        })
        expect(layer).toHaveFocus()
        expect(layer).toHaveClass("cursor-grabbing")
        if (frame) expect(frame).toHaveStyle({ pointerEvents: "none" })
        fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
        expect(layer).toHaveStyle({ left: "177px", top: "163px", ...initialSize })
        fireEvent.pointerUp(document)
        expect(layer).not.toHaveClass("cursor-grabbing")
        if (frame) {
          expect(screen.getByTitle("HTML preview")).toBe(frame)
          expect(frame).toHaveStyle({ pointerEvents: "auto" })
        }
      },
    )

    it("keeps resizing on the existing right handle", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      fireEvent.pointerDown(screen.getByRole("button", { name: "Resize from right" }), { clientX: 740, clientY: 340 })
      fireEvent.pointerMove(document, { clientX: 800, clientY: 340, ctrlKey: true })
      expect(layer).toHaveStyle({ left: "100px", top: "100px", width: "700px", height: "480px" })
      expect(layer).not.toHaveClass("cursor-grabbing")
      fireEvent.pointerUp(document)
    })

    it("activates Layer shortcuts by selecting an edge", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const frame = screen.getByTitle("HTML preview") as HTMLIFrameElement
      frame.focus()
      fireEvent.pointerDown(screen.getByRole("button", { name: "Move from left edge" }), { clientX: 96, clientY: 160 })
      fireEvent.pointerUp(document)
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      expect(layer).toHaveFocus()
      fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" })
      expect(layer).toHaveStyle({ left: "101px" })
      fireEvent.keyDown(document.activeElement as Element, { key: "Delete" })
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it("hides the move edges while keeping the toolbar available when the layer is hidden", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      expect(screen.getAllByRole("button", { name: /Move from .* edge/ })).toHaveLength(4)
      fireEvent.click(screen.getByRole("button", { name: "Hide layer" }))
      expect(screen.queryByRole("button", { name: /Move from .* edge/ })).not.toBeInTheDocument()
      expect(screen.getByRole("toolbar", { name: "Layer controls" })).toBeVisible()
      fireEvent.pointerDown(screen.getByRole("toolbar", { name: "Layer controls" }), { clientX: 140, clientY: 160 })
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(screen.getByRole("group", { name: "Draggable layer overlay" })).toHaveStyle({
        left: "177px",
        top: "163px",
      })
      fireEvent.pointerUp(document)
    })
  })

  describe("layer controls", () => {
    describe("toolbar recovery", () => {
      let notifyResize: (() => void) | undefined
      let toolbarWidth: number
      let originalObserver: typeof ResizeObserver
      let originalWidth: number
      let originalHeight: number

      beforeEach(() => {
        toolbarWidth = 500
        notifyResize = undefined
        originalObserver = globalThis.ResizeObserver
        originalWidth = window.innerWidth
        originalHeight = window.innerHeight
        const getRect = HTMLElement.prototype.getBoundingClientRect
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
          return this.getAttribute("role") === "toolbar" ? new DOMRect(0, 0, toolbarWidth, 28) : getRect.call(this)
        })
        vi.stubGlobal(
          "ResizeObserver",
          class {
            constructor(callback: () => void) {
              notifyResize = callback
            }
            observe() {}
            disconnect() {}
          },
        )
      })

      afterEach(() => {
        vi.restoreAllMocks()
        vi.stubGlobal("ResizeObserver", originalObserver)
        vi.stubGlobal("innerWidth", originalWidth)
        vi.stubGlobal("innerHeight", originalHeight)
      })

      function move(dx: number, dy: number) {
        fireEvent.pointerDown(screen.getByRole("toolbar", { name: "Layer controls" }), { clientX: 140, clientY: 160 })
        fireEvent.pointerMove(document, { clientX: 140 + dx, clientY: 160 + dy, ctrlKey: true })
        fireEvent.pointerUp(document)
      }

      it.each(
        [
          { direction: "above", dx: 0, dy: -300, left: 108, top: 0 },
          { direction: "left", dx: -300, dy: 0, left: 0, top: 108 },
          { direction: "right", dx: 900, dy: 0, left: 524, top: 108 },
          { direction: "below", dx: 0, dy: 650, left: 108, top: 740 },
        ].flatMap((bounds) => layerSources.map((source) => ({ ...bounds, ...source }))),
      )(
        "keeps the $name toolbar onscreen when the layer extends $direction the viewport",
        ({ source, dx, dy, left, top }) => {
          render(<ImageOverlay source={source} onDelete={mockOnDelete} />)
          move(dx, dy)
          expect(screen.getByRole("group", { name: "Draggable layer overlay" })).toHaveStyle({
            left: `${100 + dx}px`,
            top: `${100 + dy}px`,
          })
          expect(screen.getByRole("toolbar", { name: "Layer controls" })).toHaveStyle({
            position: "fixed",
            left: `${left}px`,
            top: `${top}px`,
          })
        },
      )

      it("moves a partially offscreen HTML layer back using the visible toolbar", () => {
        render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
        move(0, -300)
        expect(screen.getByRole("toolbar", { name: "Layer controls" })).toHaveStyle({ top: "0px" })
        move(0, 350)
        expect(screen.getByRole("group", { name: "Draggable layer overlay" })).toHaveStyle({ top: "150px" })
        expect(screen.getByRole("toolbar", { name: "Layer controls" })).toHaveStyle({ top: "158px" })
      })

      it("keeps the toolbar accessible after the browser viewport shrinks", () => {
        render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
        move(600, 500)
        vi.stubGlobal("innerWidth", 600)
        vi.stubGlobal("innerHeight", 400)
        fireEvent.resize(window)
        expect(screen.getByRole("toolbar", { name: "Layer controls" })).toHaveStyle({ left: "100px", top: "372px" })
      })

      it("adjusts for the collapsed toolbar's measured width", () => {
        render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
        move(900, 0)
        fireEvent.click(screen.getByRole("button", { name: "Collapse toolbar" }))
        toolbarWidth = 60
        expect(notifyResize).toBeTypeOf("function")
        act(() => notifyResize?.())
        expect(screen.getByRole("toolbar", { name: "Layer controls" })).toHaveStyle({ left: "964px" })
      })
    })

    it.each([
      "Layer controls",
      "Resize from right",
      "Move from top edge",
      "Move from right edge",
      "Move from bottom edge",
      "Move from left edge",
    ])("restores HTML interaction when %s is cancelled", (control) => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const frame = screen.getByTitle("HTML preview")
      const layer = screen.getByRole("group", { name: "Draggable layer overlay" })
      fireEvent.pointerDown(screen.getByRole(control === "Layer controls" ? "toolbar" : "button", { name: control }), {
        clientX: 140,
        clientY: 160,
      })
      expect(frame).toHaveStyle({ pointerEvents: "none" })
      fireEvent.pointerCancel(document)
      expect(frame).toHaveStyle({ pointerEvents: "auto" })
      expect(layer).not.toHaveClass("cursor-grabbing")
      fireEvent.pointerMove(document, { clientX: 217, clientY: 223, ctrlKey: true })
      expect(layer).toHaveStyle({ left: "100px", top: "100px", width: "640px", height: "480px" })
    })

    it.each([
      { dimension: "Width (px)", value: "400", width: "400px", height: "600px" },
      { dimension: "Height (px)", value: "600", width: "400px", height: "600px" },
    ])("locks the current HTML proportions when changing $dimension", ({ dimension, value, width, height }) => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      fireEvent.change(screen.getByRole("spinbutton", { name: "Width (px)" }), { target: { value: "320" } })
      fireEvent.click(screen.getByRole("button", { name: "Lock aspect ratio" }))
      fireEvent.change(screen.getByRole("spinbutton", { name: dimension }), { target: { value } })
      expect(screen.getByTitle("HTML preview")).toHaveStyle({ width, height })
    })

    it("changes the viewport width without scaling or reloading the HTML", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const frame = screen.getByTitle("HTML preview")
      expect(frame).toHaveStyle({ width: "640px", height: "480px" })
      fireEvent.change(screen.getByRole("spinbutton", { name: "Width (px)" }), { target: { value: "375" } })
      expect(screen.getByTitle("HTML preview")).toBe(frame)
      expect(frame).toHaveStyle({ width: "375px", height: "480px" })
      expect(screen.queryByRole("img", { name: "overlay" })).not.toBeInTheDocument()
    })

    it("keeps the HTML mounted when hidden and applies overlay opacity", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const frame = screen.getByTitle("HTML preview")
      fireEvent.change(screen.getByRole("spinbutton", { name: "Opacity (%)" }), { target: { value: "45" } })
      expect(frame).toHaveStyle({ opacity: "0.45", pointerEvents: "auto" })
      fireEvent.click(screen.getByRole("button", { name: "Hide layer" }))
      expect(screen.getByTitle("HTML preview")).toBe(frame)
      expect(frame).not.toBeVisible()
      fireEvent.click(screen.getByRole("button", { name: "Show layer" }))
      expect(frame).toBeVisible()
    })

    it("keeps resize pointer events on the comparison page while allowing HTML interaction afterward", () => {
      render(<ImageOverlay source={{ kind: "html", html: "<h1>Mock</h1>" }} onDelete={mockOnDelete} />)
      const frame = screen.getByTitle("HTML preview")
      fireEvent.pointerDown(screen.getByRole("button", { name: "Resize from right" }))
      expect(frame).toHaveStyle({ pointerEvents: "none" })
      fireEvent.pointerUp(document)
      expect(frame).toHaveStyle({ pointerEvents: "auto" })
    })
  })

  describe("rendering", () => {
    it("should render the image with imageData", () => {
      const imageData = "data:image/png;base64,iVBORw0KGgo="
      render(<ImageOverlay source={{ kind: "image", dataUrl: imageData }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute("src", imageData)
    })

    it("should render resize handles", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const handles = screen.getAllByRole("button", { name: /Resize from/i })
      expect(handles).toHaveLength(8)
    })

    it("should render toolbar", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      expect(screen.getByRole("toolbar", { name: "Layer controls" })).toBeInTheDocument()
    })
  })

  describe("image size initialization", () => {
    it("should set size based on image natural dimensions on load", async () => {
      const imageData = "data:image/png;base64,iVBORw0KGgo="

      render(<ImageOverlay source={{ kind: "image", dataUrl: imageData }} onDelete={mockOnDelete} />)

      // MockImage sets naturalWidth=400, naturalHeight=300
      // Initial state is 200x200, so this verifies onload was called
      await waitFor(() => {
        const img = screen.getByRole("img", { name: "overlay" })
        expect(img).toHaveStyle({ width: "400px", height: "300px" })
      })
    })
  })

  describe("drag and resize styles", () => {
    it("should have cursor-move class by default", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })
      expect(fieldset).toHaveClass("cursor-move")
    })

    it("should change to cursor-grabbing when dragging", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })
      const img = screen.getByRole("img", { name: "overlay" })

      fireEvent.pointerDown(img, { clientX: 100, clientY: 100 })

      expect(fieldset).toHaveClass("cursor-grabbing")
    })
  })

  describe("SVG processing", () => {
    it("should process SVG images with preserveAspectRatio", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
      const svgData = `data:image/svg+xml;base64,${btoa(svgContent)}`

      render(<ImageOverlay source={{ kind: "image", dataUrl: svgData }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      const src = img.getAttribute("src") ?? ""

      const decoded = atob(src.split("base64,")[1])
      expect(decoded).toContain('preserveAspectRatio="none"')
    })

    it("should not modify non-SVG images", () => {
      const pngData = "data:image/png;base64,iVBORw0KGgo="

      render(<ImageOverlay source={{ kind: "image", dataUrl: pngData }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveAttribute("src", pngData)
    })
  })

  describe("delete functionality", () => {
    it("should call onDelete when delete button is clicked", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      fireEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe("hover behavior", () => {
    it("should show resize handles on hover", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })
      const handles = screen.getAllByRole("button", { name: /Resize from/i })

      handles.forEach((handle) => {
        expect(handle).toHaveClass("opacity-0")
      })

      fireEvent.pointerEnter(fieldset)

      handles.forEach((handle) => {
        expect(handle).toHaveClass("opacity-100")
      })
    })

    it("should hide resize handles on pointer leave", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })
      const handles = screen.getAllByRole("button", { name: /Resize from/i })

      fireEvent.pointerEnter(fieldset)

      handles.forEach((handle) => {
        expect(handle).toHaveClass("opacity-100")
      })

      fireEvent.pointerLeave(fieldset)

      handles.forEach((handle) => {
        expect(handle).toHaveClass("opacity-0")
      })
    })
  })

  describe("visibility toggle", () => {
    it("should hide image when visibility is toggled off", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const toggleButton = screen.getByRole("button", { name: "Hide layer" })
      fireEvent.click(toggleButton)

      expect(screen.queryByRole("img", { name: "overlay" })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Show layer" })).toBeInTheDocument()
    })

    it("should show image when visibility is toggled back on", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const hideButton = screen.getByRole("button", { name: "Hide layer" })
      fireEvent.click(hideButton)

      const showButton = screen.getByRole("button", { name: "Show layer" })
      fireEvent.click(showButton)

      expect(screen.getByRole("img", { name: "overlay" })).toBeInTheDocument()
    })
  })

  describe("Backspace key deletion", () => {
    it.each(["Backspace", "Delete"])("calls onDelete when %s is pressed on the overlay", (key) => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)
      const fieldset = screen.getByRole("group")
      fireEvent.pointerDown(fieldset)
      fireEvent.keyDown(fieldset, { key })
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it("should not call onDelete when other keys are pressed on the overlay", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)
      const fieldset = screen.getByRole("group")
      fireEvent.keyDown(fieldset, { key: "Enter" })
      fireEvent.keyDown(fieldset, { key: "Escape" })
      expect(mockOnDelete).not.toHaveBeenCalled()
    })

    it.each(["Backspace", "Delete"])("does not delete the layer when %s is pressed inside an input", (key) => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)
      const fieldset = screen.getByRole("group")
      fireEvent.pointerEnter(fieldset)
      const widthInput = screen.getByRole("spinbutton", { name: /width/i })
      fireEvent.keyDown(widthInput, { key })
      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe("Arrow key movement", () => {
    it("should move by 1px in the correct axis per direction", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)
      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })

      const initialTop = Number.parseFloat(fieldset.style.top)
      fireEvent.keyDown(fieldset, { key: "ArrowUp" })
      expect(Number.parseFloat(fieldset.style.top)).toBe(initialTop - 1)
      fireEvent.keyDown(fieldset, { key: "ArrowDown" })
      expect(Number.parseFloat(fieldset.style.top)).toBe(initialTop)

      const initialLeft = Number.parseFloat(fieldset.style.left)
      fireEvent.keyDown(fieldset, { key: "ArrowLeft" })
      expect(Number.parseFloat(fieldset.style.left)).toBe(initialLeft - 1)
      fireEvent.keyDown(fieldset, { key: "ArrowRight" })
      expect(Number.parseFloat(fieldset.style.left)).toBe(initialLeft)
    })

    it("should move 10px when Shift is held", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)
      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })

      const initialTop = Number.parseFloat(fieldset.style.top)
      fireEvent.keyDown(fieldset, { key: "ArrowUp", shiftKey: true })
      expect(Number.parseFloat(fieldset.style.top)).toBe(initialTop - 10)
      fireEvent.keyDown(fieldset, { key: "ArrowDown", shiftKey: true })
      expect(Number.parseFloat(fieldset.style.top)).toBe(initialTop)

      const initialLeft = Number.parseFloat(fieldset.style.left)
      fireEvent.keyDown(fieldset, { key: "ArrowLeft", shiftKey: true })
      expect(Number.parseFloat(fieldset.style.left)).toBe(initialLeft - 10)
      fireEvent.keyDown(fieldset, { key: "ArrowRight", shiftKey: true })
      expect(Number.parseFloat(fieldset.style.left)).toBe(initialLeft)
    })

    it("should not move when Arrow key is pressed inside an input", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)
      const fieldset = screen.getByRole("group", { name: "Draggable layer overlay" })
      fireEvent.pointerEnter(fieldset)
      const initialLeft = Number.parseFloat(fieldset.style.left)
      const widthInput = screen.getByRole("spinbutton", { name: /width/i })
      fireEvent.keyDown(widthInput, { key: "ArrowRight" })
      expect(Number.parseFloat(fieldset.style.left)).toBe(initialLeft)
    })
  })

  describe("opacity control", () => {
    it("should apply opacity style to image", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveStyle({ opacity: "1" })

      const opacitySlider = screen.getByRole("slider", { name: "Opacity" })
      fireEvent.change(opacitySlider, { target: { value: "50" } })

      expect(img).toHaveStyle({ opacity: "0.5" })
    })

    it("should render opacity as an editable number input with the current value", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const opacityInput = screen.getByRole("spinbutton", { name: "Opacity (%)" })
      expect(opacityInput).toHaveValue(100)
    })

    it("should display a % suffix next to the opacity input", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      expect(screen.getByText("%")).toBeInTheDocument()
    })

    it("should update opacity when the number input changes", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const opacityInput = screen.getByRole("spinbutton", { name: "Opacity (%)" })
      fireEvent.change(opacityInput, { target: { value: "50" } })

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveStyle({ opacity: "0.5" })
      const opacitySlider = screen.getByRole("slider", { name: "Opacity" })
      expect(opacitySlider).toHaveValue("50")
    })

    it("should clamp opacity number input values above 100 to 100", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const opacityInput = screen.getByRole("spinbutton", { name: "Opacity (%)" })
      fireEvent.change(opacityInput, { target: { value: "150" } })

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveStyle({ opacity: "1" })
    })

    it("should clamp opacity number input values below 0 to 0", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const opacityInput = screen.getByRole("spinbutton", { name: "Opacity (%)" })
      fireEvent.change(opacityInput, { target: { value: "-20" } })

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveStyle({ opacity: "0" })
    })

    it("should treat a non-numeric opacity input as 0", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const opacityInput = screen.getByRole("spinbutton", { name: "Opacity (%)" })
      fireEvent.change(opacityInput, { target: { value: "" } })

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveStyle({ opacity: "0" })
    })
  })

  describe("snap guides", () => {
    it("should not render snap guide lines when not dragging", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      expect(screen.queryByTestId("snap-guide-vertical")).not.toBeInTheDocument()
      expect(screen.queryByTestId("snap-guide-horizontal")).not.toBeInTheDocument()
    })

    it("should render a vertical snap guide line when dragging near the left edge of the viewport", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      // initial position is x=100; dx = 53 - 150 = -97 -> newX = 3 (within 8px of 0)
      fireEvent.pointerDown(img, { clientX: 150, clientY: 150 })
      fireEvent.pointerMove(document, { clientX: 53, clientY: 150 })

      expect(screen.queryByTestId("snap-guide-vertical")).toBeInTheDocument()
    })

    it("should render a horizontal snap guide line when dragging near the top edge of the viewport", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      // initial position is y=100; dy = 53 - 150 = -97 -> newY = 3 (within 8px of 0)
      fireEvent.pointerDown(img, { clientX: 150, clientY: 150 })
      fireEvent.pointerMove(document, { clientX: 150, clientY: 53 })

      expect(screen.queryByTestId("snap-guide-horizontal")).toBeInTheDocument()
    })

    it("should not render snap guide lines when dragging outside the snap threshold", () => {
      render(<ImageOverlay source={{ kind: "image", dataUrl: "data:image/png;base64,test" }} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      fireEvent.pointerDown(img, { clientX: 150, clientY: 150 })
      fireEvent.pointerMove(document, { clientX: 200, clientY: 150 })

      expect(screen.queryByTestId("snap-guide-vertical")).not.toBeInTheDocument()
      expect(screen.queryByTestId("snap-guide-horizontal")).not.toBeInTheDocument()
    })
  })
})
