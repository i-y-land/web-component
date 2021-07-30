import { deferUntil, deferUntilNextFrame } from "../../library/component.js";
import { assert, assertWhen, renderTests, test } from "../../library/test.js";
import { calculatePosition } from "./slider.js";

export const runTests = renderTests(
  test(
    "The component attribute value takes precedence",
    (root) =>
      Promise.all(
        [[0.2, 55], [0.4, 111], [0.8, 222]]
          .map(([v, cx]) => {
            const e = window.document.createElement("iy-slider");
            e.setAttribute("value", String(v));
            root.appendChild(e);

            return assertWhen(
              () => e.isAsyncConnected,
              () =>
                e.shadowRoot.querySelector("ellipse.thumb").getAttribute(
                  "cx",
                ) === String(cx),
            );
          }),
      ),
  ),
  test(
    "Setting the value key updates the position of the thumb",
    (root) => {
      const e = window.document.createElement("iy-slider");
      e.value = 0.4;

      root.appendChild(e);

      return deferUntil(e, (e) => e.isAsyncConnected)
        .then(() => {
          const x1 = Number(
            e.shadowRoot.querySelector(".thumb").getAttribute("cx"),
          );
          e.value = 0.8;

          return deferUntilNextFrame()
            .then(deferUntilNextFrame)
            .then(() => {
              const x2 = Number(
                e.shadowRoot.querySelector(".thumb").getAttribute("cx"),
              );

              return assert(
                x1 !== x2,
                `The value should be different: x1 (${x1}) x2 (${x2}`,
              );
            });
        });
    },
  ),
  test(
    "calculatePosition",
    () => {
      return assert(
        calculatePosition(
          0.5,
          { offset: 32, radius: 14, width: 277 },
        ) === 138,
      );
    },
  ),
);
