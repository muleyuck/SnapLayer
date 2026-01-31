import { describe, expect, it } from "vitest"
import { processSvgImage } from "@/utils/processSvgImage"

describe("processSvgImage", () => {
  describe("non-SVG images", () => {
    it("should return undefined for undefined input", () => {
      expect(processSvgImage(undefined)).toBeUndefined()
    })

    it("should return non-SVG image data unchanged", () => {
      const pngData = "data:image/png;base64,iVBORw0KGgo="
      expect(processSvgImage(pngData)).toBe(pngData)
    })
  })

  describe("base64 encoded SVG", () => {
    it("should add preserveAspectRatio='none' to SVG without it", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
      const base64Svg = `data:image/svg+xml;base64,${btoa(svgContent)}`

      const result = processSvgImage(base64Svg)

      expect(result).toContain("data:image/svg+xml;base64,")
      const decoded = atob(result?.split("base64,")[1] ?? "")
      expect(decoded).toContain('preserveAspectRatio="none"')
    })

    it("should replace existing preserveAspectRatio attribute", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><rect/></svg>'
      const base64Svg = `data:image/svg+xml;base64,${btoa(svgContent)}`

      const result = processSvgImage(base64Svg)

      const decoded = atob(result?.split("base64,")[1] ?? "")
      expect(decoded).toContain('preserveAspectRatio="none"')
      expect(decoded).not.toContain("xMidYMid meet")
    })
  })

  describe("URL encoded SVG", () => {
    it("should process URL-encoded SVG", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
      const urlEncodedSvg = `data:image/svg+xml,${encodeURIComponent(svgContent)}`

      const result = processSvgImage(urlEncodedSvg)

      expect(result).toContain("data:image/svg+xml;base64,")
      const decoded = atob(result?.split("base64,")[1] ?? "")
      expect(decoded).toContain('preserveAspectRatio="none"')
    })
  })

  describe("error handling", () => {
    it("should return original URL on invalid base64", () => {
      const invalidSvg = "data:image/svg+xml;base64,!!!invalid-base64!!!"

      const result = processSvgImage(invalidSvg)

      expect(result).toBe(invalidSvg)
    })

    it("should return original URL when SVG contains non-Latin1 characters", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><text>日本語</text></svg>'
      const urlEncodedSvg = `data:image/svg+xml,${encodeURIComponent(svgContent)}`

      const result = processSvgImage(urlEncodedSvg)

      expect(result).toBe(urlEncodedSvg)
    })
  })

  describe("edge cases", () => {
    it("should replace preserveAspectRatio with single quotes", () => {
      const svgContent = "<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMidYMid meet'><rect/></svg>"
      const base64Svg = `data:image/svg+xml;base64,${btoa(svgContent)}`

      const result = processSvgImage(base64Svg)

      const decoded = atob(result?.split("base64,")[1] ?? "")
      expect(decoded).toContain('preserveAspectRatio="none"')
      expect(decoded).not.toContain("xMidYMid meet")
    })

    it("should preserve other SVG attributes", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect/></svg>'
      const base64Svg = `data:image/svg+xml;base64,${btoa(svgContent)}`

      const result = processSvgImage(base64Svg)

      const decoded = atob(result?.split("base64,")[1] ?? "")
      expect(decoded).toContain('preserveAspectRatio="none"')
      expect(decoded).toContain('viewBox="0 0 100 100"')
    })
  })
})
