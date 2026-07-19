import { createApp } from "vue";
import {
  createUniIntent,
  gamepadAdapter,
  keyboardAdapter,
  mouseAdapter,
} from "vue-uni-intent";
import App from "./App.vue";
import "./theme.css";

createApp(App)
  .use(
    createUniIntent({
      adapters: [
        keyboardAdapter(),
        mouseAdapter(),
        gamepadAdapter({ rightStickScroll: true }),
      ],
      wrap: true,
      debug: true,
    }),
  )
  .mount("#app");
