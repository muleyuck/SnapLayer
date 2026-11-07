import { describe, expect, it } from "vitest"
import manifest from "../../public/manifest.json"
import { HTML_PREVIEW_PAGE, HTML_SANDBOX_PAGE } from "../htmlPreview"

describe("HTML preview manifest", () => {
  it("exposes both frame pages while withholding extension privileges from the renderer", () => {
    expect(manifest.permissions).toEqual(["activeTab", "scripting"])
    expect(manifest.sandbox.pages).toEqual([HTML_SANDBOX_PAGE])
    expect(manifest.web_accessible_resources[0].resources).toEqual(
      expect.arrayContaining([HTML_PREVIEW_PAGE, HTML_SANDBOX_PAGE]),
    )
    expect(manifest.content_security_policy.sandbox).toMatch(/^sandbox allow-scripts;/)
    expect(manifest.content_security_policy.sandbox).not.toContain("allow-same-origin")
    const policies = Object.fromEntries(
      manifest.content_security_policy.sandbox.split(";").map((directive) => {
        const [name, ...values] = directive.trim().split(/\s+/)
        return [name, values]
      }),
    )
    for (const directive of ["script-src", "style-src", "img-src", "font-src", "connect-src"]) {
      expect(policies[directive]).toContain("https:")
    }
    expect(policies["frame-src"]).not.toContain("https:")
  })
})
