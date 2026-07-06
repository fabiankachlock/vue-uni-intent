import { addons } from "storybook/manager-api";

// Storybook's single-key shortcuts (F, A, S, …) would fire while driving the
// demos with the keyboard — and driving the demos is the whole point here.
addons.setConfig({ enableShortcuts: false });
