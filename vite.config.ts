import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Dev server runs the playground app, which imports the library
  // via the "vue-uni-intent" alias — exactly like a consumer would.
  if (command === "serve") {
    return {
      root: fileURLToPath(new URL("./playground", import.meta.url)),
      plugins: [vue(), vueDevTools()],
      resolve: {
        alias: {
          "vue-uni-intent": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        },
      },
    };
  }

  // Build produces the library bundle.
  return {
    plugins: [
      vue(),
      dts({
        tsconfigPath: "./tsconfig.app.json",
      }),
    ],
    build: {
      lib: {
        entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        formats: ["es"],
        fileName: "index",
      },
      rollupOptions: {
        external: ["vue"],
      },
    },
  };
});
