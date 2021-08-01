import { deferUntil, deferUntilNextFrame } from "../../library/component.js";
import { assert, renderTests, test } from "../../library/test.js";
import { calculatePosition } from "./slider.js";

export const runTests = renderTests(
  test(
    "Setting the value key updates the position of the thumb",
    (root) => {
      const e = window.document.createElement("iy-slider");
      e.value = 40;

      root.appendChild(e);

      return deferUntil(e, (e) => e.isAsyncConnected)
        .then(() => {
          const x1 = Number(
            e.shadowRoot.querySelector(".thumb").getAttribute("cx"),
          );
          e.value = 80;

          return deferUntilNextFrame()
            .then(deferUntilNextFrame)
            .then(() => {
              const x2 = Number(
                e.shadowRoot.querySelector(".thumb").getAttribute("cx"),
              );

              assert(
                x1 !== x2,
                `The value should be different: x1 (${x1}) x2 (${x2}`,
              );
            });
        });
    },
  ),
  test(
    "If I set the attribute, the component's dispatch a `change` event",
    (root) => {
      const e = window.document.createElement("iy-slider");
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
            e.setAttribute("value", String(80));;
          })
        );
    },
  ),
  test(
    "calculatePosition",
    () => {
      assert(
        calculatePosition(
          50,
          {
            max: 100,
            min: 0,
            offset: 32,
            radius: 14,
            width: 277
          },
        ) === 137,
      );
    },
  ),
);
