import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import shimReactPdf from "vite-plugin-shim-react-pdf"

export default defineConfig({
  base: "/blutack/",
  plugins: [topLevelAwait(), react(), wasm(), shimReactPdf()],

  optimizeDeps: {
    // This is necessary because otherwise `vite dev` includes two separate
    // versions of the JS wrapper. This causes problems because the JS
    // wrapper has a module level variable to track JS side heap
    // allocations, initializing this twice causes horrible breakage
    exclude: ["@automerge/automerge-wasm"],
  },

  resolve: {
    alias: {
      path: "path-browserify",
    },
  },

  server: {
    fs: {
      strict: false,
    },
  },
})
