import type { Meta, StoryObj } from "@storybook/vue3-vite";
import AvailableInputsDemo from "./demos/AvailableInputsDemo.vue";

const meta = {
  title: "Basics/Available Inputs",
  component: AvailableInputsDemo,
} satisfies Meta<typeof AvailableInputsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `useAvailableInputs()` reactively reports which input sources are usable right
 * now — `keyboard`, `mouse`, `touch`, and `gamepad` — so the UI can adapt (swap
 * button-prompt glyphs, hide keyboard hints on a phone, show a controller
 * badge). Availability reflects real device capability, reported by the
 * installed adapters, so `mouse` and `touch` are tracked independently and
 * `gamepad` toggles as controllers connect and disconnect.
 */
export const Default: Story = {};
