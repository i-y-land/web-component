import { deferUntil } from "../../library/component.js";
import { assert, assertEquals, assertWhen, renderTests, test } from "../../library/test.js";
import { attributeChangedCallback } from "./stepper.js";

export const runTests = renderTests(
  test(
    "If I click on the `clickable` ellipse, the component's is rendered",
    (root) => {
      const e = window.document.createElement("iy-stepper");
      e.setAttribute("value", String(42));
      root.appendChild(e);

      return new Promise((resolve) => setTimeout(resolve, 500))
        .then(() => {
          e.shadowRoot.querySelector(".clickable.add").dispatchEvent(
            new Event("click"),
          );

          return assertWhen(
            () => e.isAsyncConnected,
            () =>
              e.shadowRoot.querySelector("text.number").textContent === "43" &&
              e.value === 43,
          );
        });
    },
  ),
  test(
    "If I set the `value` to an empty string, the value is 0",
    (root) => {
      const e = window.document.createElement("iy-stepper");
      e.setAttribute("value", String(42));
      root.appendChild(e);
      e.setAttribute("value", "");

      return new Promise((resolve) => setTimeout(resolve, 500))
        .then(() => {
          return assertWhen(
            () => e.isAsyncConnected,
            () =>
              e.shadowRoot.querySelector("text.number").textContent === "0" &&
              e.value === 0,
            `The value was changed to ${e.value}`
          );
        });
    },
  ),
  test(
    "If I set the attribute, the component's dispatch a `change` event",
    (root) => {
      const e = window.document.createElement("iy-stepper");
      e.setAttribute("value", String(42));
      root.appendChild(e);

      return deferUntil(e, (e) => e.isAsyncConnected)
        .then(() =>
          new Promise((resolve, reject) => {
            const t = setTimeout(
              () => reject(new Error("Timed out")),
              1000 * 5,
            );
            e.addEventListener("change", () => {
              clearTimeout(t);
              resolve();
            });
            e.shadowRoot.querySelector(".clickable.add").dispatchEvent(
              new Event("click"),
            );
          })
        );
    },
  ),
  test(
    "attributeChangedCallback",
    () => {
      assertEquals(
        attributeChangedCallback({ oldValue: 0, value: 1 }),
        { value: 1 }
      );
      assert(!attributeChangedCallback({ oldValue: 1, value: 1 }));
      assert(!attributeChangedCallback({ oldValue: 1, value: -1 }));
    }
  )
);
