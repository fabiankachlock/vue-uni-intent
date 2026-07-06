import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Storybook-only Vite config. Stories import the library through the
// "vue-uni-intent" alias — exactly like a consumer would.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "vue-uni-intent": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
});
