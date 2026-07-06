import type { Meta, StoryObj } from "@storybook/vue3-vite";
import ModalDemo from "./demos/ModalDemo.vue";
import NestedLayersDemo from "./demos/NestedLayersDemo.vue";

const meta = {
  title: "Layers",
} satisfies Meta;

export default meta;

/** A modal pushes a trigger layer: input is confined to it while it is topmost. */
export const ModalDialog: StoryObj = {
  render: () => ({ components: { ModalDemo }, template: "<ModalDemo />" }),
};

/** Layers stack arbitrarily deep; closing one returns input to the layer below. */
export const NestedLayers: StoryObj = {
  render: () => ({ components: { NestedLayersDemo }, template: "<NestedLayersDemo />" }),
};
