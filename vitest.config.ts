import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// Standalone config (not merged with vite.config.ts, which is conditional
// between playground serve and library build — neither fits tests).
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "vue-uni-intent": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**"],
    root: fileURLToPath(new URL("./", import.meta.url)),
  },
});
