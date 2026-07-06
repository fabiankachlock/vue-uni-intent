import type { Meta, StoryObj } from "@storybook/vue3-vite";
import GameMenuDemo from "./demos/GameMenuDemo.vue";

const meta = {
  title: "Examples/Game Menu",
  component: GameMenuDemo,
} satisfies Meta<typeof GameMenuDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Everything together: a pause menu with disabled entries, detached corner buttons
 * reached purely via spatial navigation, a settings layer with toggling triggers,
 * a quit confirmation, and Esc / gamepad B / mouse-back shortcuts.
 */
export const Default: Story = {};
