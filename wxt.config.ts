import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "wxt"

export default defineConfig({
  srcDir: "src",
  imports: false,
  manifest: {
    name: "SnapLayer",
    version: "0.1.0",
    description: "lets you overlay JPEG/PNG/SVG images on any webpage.",
    permissions: ["activeTab", "scripting"],
    web_accessible_resources: [
      {
        resources: ["overlay.js"],
        matches: ["http://*/*", "https://*/*"],
      },
    ],
    icons: {
      16: "favicon16.png",
      32: "favicon32.png",
      48: "favicon48.png",
      128: "favicon128.png",
    },
  },
  outDir: "dist",
  vite: () => ({
    plugins: [react(), tailwindcss()],
  }),
})
