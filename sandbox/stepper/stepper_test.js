import { deferUntil } from "../../library/component.js";
import { assertWhen, renderTests, test } from "../../library/test.js";
import "./stepper.js";

export const runTests = renderTests(
  test(
    "The component attribute value takes precedence",
    (root) =>
      Promise.all(
        [42, 24, 12]
          .map((v) => {
            const e = window.document.createElement("iy-stepper");
            e.setAttribute("value", String(v));
            root.appendChild(e);

            return assertWhen(
              () => e.isAsyncConnected,
              () =>
                e.shadowRoot.querySelector("text.number").textContent ===
                  String(v),
            );
          }),
      ),
  ),
  test(
    "If I set the atttribute, the component is rendered",
    (root) => {
      const e = window.document.createElement("iy-stepper");
      e.setAttribute("value", String(42));
      root.appendChild(e);
      e.setAttribute("value", String(24));

      return assertWhen(
        () => e.isAsyncConnected,
        () => e.shadowRoot.querySelector("text.number").textContent === "24",
      );
    },
  ),
  test(
    "If I set the value, the component's attribute is updated and the component is rendered",
    (root) => {
      const e = window.document.createElement("iy-stepper");
      e.setAttribute("value", String(42));
      root.appendChild(e);
      e.value = 12;

      return assertWhen(
        () => e.isAsyncConnected,
        () =>
          e.shadowRoot.querySelector("text.number").textContent === "12" &&
          e.value === 12,
      );
    },
  ),
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
    "If I set the `value` to an empty string, the component's is not rendered",
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
              e.shadowRoot.querySelector("text.number").textContent === "42" &&
              e.value === 42,
          );
        });
    },
  ),
  test(
    "If I set the attribute, the component's dispatch an event",
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
);
