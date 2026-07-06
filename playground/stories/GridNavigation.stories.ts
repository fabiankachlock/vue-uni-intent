import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { gamepadAdapter, keyboardAdapter, mouseAdapter } from "vue-uni-intent";
import GridDemo from "./demos/GridDemo.vue";

const meta = {
  title: "Basics/Grid Navigation",
  component: GridDemo,
  argTypes: {
    columns: { control: { type: "range", min: 1, max: 8 } },
    rows: { control: { type: "range", min: 1, max: 6 } },
  },
} satisfies Meta<typeof GridDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spatial navigation across a grid — arrow keys, D-pad, left stick, or mouse hover. */
export const Default: Story = {
  args: {
    columns: 4,
    rows: 3,
    help: "Move with ↑ ↓ ← →, D-pad, or left stick; hover with the mouse. Activate with Enter/Space, gamepad A, or click. Navigation wraps around the edges.",
  },
};

/** With `wrap: false`, navigation stops at the edges instead of wrapping around. */
export const NoWrap: Story = {
  args: {
    columns: 4,
    rows: 3,
    help: "This story installs the plugin with wrap: false — walking past an edge stops there instead of wrapping to the opposite side.",
  },
  parameters: { uniIntent: { wrap: false } },
};

/** Disabled triggers are skipped by navigation and can't be activated. */
export const DisabledTriggers: Story = {
  args: {
    columns: 4,
    rows: 3,
    disabledCells: [2, 6, 7, 11],
    help: "The ✕ cells are disabled: navigation skips over them, and neither click nor Enter fires them.",
  },
};

/** The keyboard adapter accepts custom key bindings — here WASD instead of arrows. */
export const CustomKeysWASD: Story = {
  name: "Custom Keys (WASD)",
  args: {
    columns: 4,
    rows: 3,
    help: "This story configures keyboardAdapter with WASD navigation keys and E to activate — arrow keys do nothing here.",
  },
  parameters: {
    uniIntent: {
      adapters: () => [
        keyboardAdapter({
          keys: {
            up: ["w", "W"],
            down: ["s", "S"],
            left: ["a", "A"],
            right: ["d", "D"],
            activate: ["e", "E", "Enter"],
          },
        }),
        mouseAdapter(),
        gamepadAdapter(),
      ],
    },
  },
};
