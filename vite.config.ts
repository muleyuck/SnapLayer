import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
  environments: {
    client: {
      build: {
        outDir: "dist",
        rollupOptions: {
          input: { popup: resolve(__dirname, "index.html") },
          output: {
            entryFileNames: "[name].js",
            chunkFileNames: "chunks/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
          },
        },
      },
    },
    content: {
      consumer: "client",
      build: {
        outDir: "dist",
        emptyOutDir: false,
        rollupOptions: {
          input: { content: resolve(__dirname, "src/content.ts") },
          output: {
            format: "iife",
            entryFileNames: "[name].js",
          },
        },
      },
    },
  },
  builder: {
    buildApp: async (builder) => {
      await builder.build(builder.environments.client)
      await builder.build(builder.environments.content)
    },
  },
})
