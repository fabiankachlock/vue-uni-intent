import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ProgrammaticDemo from "./demos/ProgrammaticDemo.vue";

const meta = {
  title: "Advanced/Programmatic Control",
  component: ProgrammaticDemo,
} satisfies Meta<typeof ProgrammaticDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drive triggers from code via the `focus()` / `trigger()` functions returned by `useTrigger()`. */
export const Default: Story = {};
