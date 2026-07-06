import type { StorybookConfig } from "@storybook/vue3-vite";

const config: StorybookConfig = {
  stories: ["../playground/stories/**/*.stories.ts"],
  framework: {
    name: "@storybook/vue3-vite",
    options: {
      // The root vite.config.ts switches between the playground dev server
      // (with a custom root) and the library build — neither fits Storybook,
      // so it gets its own minimal config.
      builder: { viteConfigPath: ".storybook/vite.config.ts" },
      docgen: false,
    },
  },
};

export default config;
