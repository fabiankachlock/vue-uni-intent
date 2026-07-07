import type { StorybookConfig } from "@storybook/vue3-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
  stories: [
    "../playground/stories/**/*.mdx",
    "../playground/stories/**/*.stories.ts",
  ],
  addons: [
    {
      // remark-gfm enables GitHub-flavored markdown (tables, etc.) in the
      // MDX docs pages — not on by default in this Storybook setup.
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],
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
