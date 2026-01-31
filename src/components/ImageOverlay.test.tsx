import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ImageOverlay } from "./ImageOverlay"

describe("ImageOverlay", () => {
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    mockOnDelete.mockReset()
  })

  describe("rendering", () => {
    it("should render the image with imageData", () => {
      const imageData = "data:image/png;base64,iVBORw0KGgo="
      render(<ImageOverlay imageData={imageData} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute("src", imageData)
    })

    it("should render resize handles", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const handles = screen.getAllByRole("button", { name: /Resize from/i })
      expect(handles).toHaveLength(8)
    })

    it("should render toolbar", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      expect(screen.getByRole("toolbar", { name: "Image controls" })).toBeInTheDocument()
    })
  })

  describe("image size initialization", () => {
    it("should set size based on image natural dimensions on load", async () => {
      const imageData = "data:image/png;base64,iVBORw0KGgo="

      render(<ImageOverlay imageData={imageData} onDelete={mockOnDelete} />)

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
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable image overlay" })
      expect(fieldset).toHaveClass("cursor-move")
    })

    it("should change to cursor-grabbing when dragging", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable image overlay" })
      const img = screen.getByRole("img", { name: "overlay" })

      fireEvent.pointerDown(img, { clientX: 100, clientY: 100 })

      expect(fieldset).toHaveClass("cursor-grabbing")
    })
  })

  describe("SVG processing", () => {
    it("should process SVG images with preserveAspectRatio", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
      const svgData = `data:image/svg+xml;base64,${btoa(svgContent)}`

      render(<ImageOverlay imageData={svgData} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      const src = img.getAttribute("src") ?? ""

      const decoded = atob(src.split("base64,")[1])
      expect(decoded).toContain('preserveAspectRatio="none"')
    })

    it("should not modify non-SVG images", () => {
      const pngData = "data:image/png;base64,iVBORw0KGgo="

      render(<ImageOverlay imageData={pngData} onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveAttribute("src", pngData)
    })
  })

  describe("delete functionality", () => {
    it("should call onDelete when delete button is clicked", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      fireEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe("hover behavior", () => {
    it("should show resize handles on hover", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable image overlay" })
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
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const fieldset = screen.getByRole("group", { name: "Draggable image overlay" })
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
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const toggleButton = screen.getByRole("button", { name: "Hide image" })
      fireEvent.click(toggleButton)

      expect(screen.queryByRole("img", { name: "overlay" })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Show image" })).toBeInTheDocument()
    })

    it("should show image when visibility is toggled back on", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const hideButton = screen.getByRole("button", { name: "Hide image" })
      fireEvent.click(hideButton)

      const showButton = screen.getByRole("button", { name: "Show image" })
      fireEvent.click(showButton)

      expect(screen.getByRole("img", { name: "overlay" })).toBeInTheDocument()
    })
  })

  describe("opacity control", () => {
    it("should apply opacity style to image", () => {
      render(<ImageOverlay imageData="data:image/png;base64,test" onDelete={mockOnDelete} />)

      const img = screen.getByRole("img", { name: "overlay" })
      expect(img).toHaveStyle({ opacity: "1" })

      const opacitySlider = screen.getByRole("slider", { name: "Opacity" })
      fireEvent.change(opacitySlider, { target: { value: "50" } })

      expect(img).toHaveStyle({ opacity: "0.5" })
    })
  })
})
