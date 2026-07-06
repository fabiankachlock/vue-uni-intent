import type { Meta, StoryObj } from "@storybook/vue3-vite";
import FocusDemo from "./demos/FocusDemo.vue";

const meta = {
  title: "Basics/Focus",
  component: FocusDemo,
  argTypes: {
    autofocusCell: { control: { type: "range", min: 1, max: 5 } },
  },
} satisfies Meta<typeof FocusDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A trigger with `autofocus` receives the layer's initial focus. */
export const Autofocus: Story = {
  args: {
    autofocusCell: 3,
    help: "The button marked (autofocus) declares autofocus, so it receives initial focus instead of the first registered trigger.",
  },
};

/** With `initialFocus: "none"`, nothing is focused until the user navigates. */
export const NoInitialFocus: Story = {
  args: {
    autofocusCell: 0,
    help: "This story installs the plugin with initialFocus: 'none' — no trigger is focused on mount; press an arrow key or hover to focus one.",
  },
  parameters: { uniIntent: { initialFocus: "none" } },
};
