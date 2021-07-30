import { deferUntil } from "../component.js";

export const assert = (v, message) =>
  Promise.resolve(v)
    .then((x) => {
      if (!x) throw new Error(`Assertion failed. ${message}`);
    });

const _assertWhenCallback = (f, g, message) =>
  new Promise((resolve, reject) => {
    if (f()) {
      window.requestAnimationFrame(() => {
        if (!g()) reject(new Error(`Assertion failed. ${message}`));
        else resolve();
      });
    } else {
      window.requestAnimationFrame(() =>
        _assertWhenCallback(f, g).then(resolve, reject)
      );
    }
  });

export const assertWhen = (f, g, message = "") =>
  new Promise((resolve, reject) => {
    window.requestAnimationFrame(() =>
      _assertWhenCallback(f, g, message).then(resolve, reject)
    );
  });

export const renderTests = (...tests) =>
  (root) => {
    return import(import.meta.url.replace("test_runner.js", "test.js"))
      .then(() => {
        for (const index in tests) {
          const { title, f } = tests[index];

          const t = window.document.createElement("iy-test");
          t.setAttribute("title", title);

          root.appendChild(t);

          setTimeout(
            () =>
              deferUntil(t, (e) => !!e.elements.sandbox)
                .then(() => (t.test = f)),
            Number(index),
          );
        }
      });
  };

export const test = (title, f) => ({ title, f });
