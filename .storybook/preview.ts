import { setup, type Preview } from "@storybook/vue3-vite";
import {
  createUniIntent,
  gamepadAdapter,
  keyboardAdapter,
  mouseAdapter,
  type UniIntentOptions,
} from "vue-uni-intent";

import "./preview.css";

/**
 * Per-story plugin options, set via `parameters.uniIntent`. Adapters are
 * passed as a factory so every mounted story app gets fresh instances.
 */
export type UniIntentParameters = Partial<Omit<UniIntentOptions, "adapters">> & {
  adapters?: () => UniIntentOptions["adapters"];
};

// Every story runs in its own Vue app; install vue-uni-intent on each one.
setup((app, context) => {
  const overrides = (context?.parameters?.uniIntent ?? {}) as UniIntentParameters;
  app.use(
    createUniIntent({
      adapters: overrides.adapters?.() ?? [keyboardAdapter(), mouseAdapter(), gamepadAdapter()],
      wrap: overrides.wrap ?? true,
      initialFocus: overrides.initialFocus ?? "first",
      debug: overrides.debug ?? true,
    }),
  );
});

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    options: {
      storySort: {
        order: [
          "Introduction",
          "Getting Started",
          "Concepts",
          "API Reference",
          "Basics",
          ["Grid Navigation", "Focus", "Shortcuts"],
          "Layers",
          "Advanced",
          "Examples",
        ],
      },
    },
  },
};

export default preview;
