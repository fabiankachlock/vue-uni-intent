/**
 * Self-running smoke test executed in a real browser (headless Chrome dumps
 * the DOM and the harness greps #results). Real KeyboardEvent/MouseEvent
 * dispatch through the real adapters — no mocks.
 */
import { defineComponent, h, nextTick, ref, createApp } from "vue";
import {
  createUniIntent,
  keyboardAdapter,
  mouseAdapter,
  useTrigger,
  useTriggerLayer,
  key,
  Key,
} from "vue-uni-intent";

const results: string[] = [];
const report = (name: string, pass: boolean) => results.push(`${pass ? "PASS" : "FAIL"} ${name}`);

const fired: Record<string, number> = {};
const modalOpen = ref(false);

const Btn = defineComponent({
  props: { id: { type: String, required: true } },
  setup(props) {
    const { ref: el } = useTrigger({
      id: props.id,
      onTrigger: () => {
        fired[props.id] = (fired[props.id] ?? 0) + 1;
        if (props.id === "open") modalOpen.value = true;
      },
    });
    return () => h("button", { ref: el, id: props.id }, props.id);
  },
});

const Modal = defineComponent({
  setup() {
    useTriggerLayer({ id: "modal" });
    const { ref: el } = useTrigger({
      id: "close",
      onTrigger: () => {
        fired.close = (fired.close ?? 0) + 1;
        modalOpen.value = false;
      },
      shortcuts: [key(Key.Escape)],
    });
    return () => h("button", { ref: el, id: "close" }, "close");
  },
});

const App = defineComponent({
  setup:
    () => () => [
      h("div", { style: "display:flex;gap:20px" }, [
        h(Btn, { id: "a" }),
        h(Btn, { id: "b" }),
        h(Btn, { id: "open" }),
      ]),
      modalOpen.value ? h(Modal) : null,
    ],
});

createApp(App)
  .use(createUniIntent({ adapters: [keyboardAdapter(), mouseAdapter()] }))
  .mount("#app");

const focusedId = () => document.querySelector("[data-uni-focused]")?.id ?? null;
const pressKey = (k: string) =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

async function run() {
  await nextTick();
  await nextTick();
  report("initial focus on first trigger", focusedId() === "a");

  pressKey("ArrowRight");
  await nextTick();
  report("ArrowRight moves focus to b", focusedId() === "b");

  pressKey("ArrowLeft");
  await nextTick();
  report("ArrowLeft moves back to a", focusedId() === "a");

  pressKey("Enter");
  report("Enter activates focused trigger", fired.a === 1);

  document.querySelector("#b")!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  await nextTick();
  report("mouseover focuses trigger", focusedId() === "b");

  document
    .querySelector("#b")!
    .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
  report("click activates trigger", fired.b === 1);

  // Open the modal layer via keyboard.
  document.querySelector("#open")!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  pressKey("Enter");
  await nextTick();
  await nextTick();
  report("modal layer takes focus", focusedId() === "close");

  pressKey("ArrowLeft");
  await nextTick();
  report("navigation confined to modal", focusedId() === "close");

  pressKey("Escape");
  await nextTick();
  await nextTick();
  report("Escape shortcut closes modal", fired.close === 1 && modalOpen.value === false);
  report("focus restored after modal", focusedId() === "open");

  document.querySelector("#results")!.textContent = results.join("\n");
}

void run();
