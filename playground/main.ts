import { createApp } from "vue";
import {
  createUniIntent,
  gamepadAdapter,
  keyboardAdapter,
  mouseAdapter,
} from "vue-uni-intent";
import App from "./App.vue";

createApp(App)
  .use(
    createUniIntent({
      adapters: [keyboardAdapter(), mouseAdapter(), gamepadAdapter()],
      wrap: true,
    }),
  )
  .mount("#app");
