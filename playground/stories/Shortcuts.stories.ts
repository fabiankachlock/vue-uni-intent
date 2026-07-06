import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ShortcutsDemo from "./demos/ShortcutsDemo.vue";

const meta = {
  title: "Basics/Shortcuts",
  component: ShortcutsDemo,
} satisfies Meta<typeof ShortcutsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Triggers can declare keyboard, gamepad, and mouse-button shortcuts that fire
 * regardless of focus — built with the `key()`, `button()`, and `mouseButton()` helpers.
 */
export const Default: Story = {};
