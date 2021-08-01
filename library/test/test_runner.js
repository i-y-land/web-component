import { deferUntil } from "../component.js";

export const assert = (v, message = "") => {
  if (!v) {
    throw new Error(`Assertion failed. ${message}`);
  }
};

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

// Inspired from Deno STD assert library
// https://deno.land/std@0.103.0/testing/asserts.ts
const _isKeyedCollection = (x) => {
  return [Symbol.iterator, "size"].every((k) => k in (x));
};

// Inspired from Deno STD assert library
// https://deno.land/std@0.103.0/testing/asserts.ts
const _isEquals = (c, d) => {
  const seen = new Map();
  return (function compare(a, b) {
    // Have to render RegExp & Date for string comparison
    // unless it's mistreated as object
    if (
      a &&
      b &&
      ((a instanceof RegExp && b instanceof RegExp) ||
        (a instanceof URL && b instanceof URL))
    ) {
      return String(a) === String(b);
    }
    if (a instanceof Date && b instanceof Date) {
      const aTime = a.getTime();
      const bTime = b.getTime();
      // Check for NaN equality manually since NaN is not
      // equal to itself.
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return true;
      }
      return a.getTime() === b.getTime();
    }
    if (Object.is(a, b)) {
      return true;
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      if (a instanceof WeakMap || b instanceof WeakMap) {
        if (!(a instanceof WeakMap && b instanceof WeakMap)) return false;
        throw new TypeError("cannot compare WeakMap instances");
      }
      if (a instanceof WeakSet || b instanceof WeakSet) {
        if (!(a instanceof WeakSet && b instanceof WeakSet)) return false;
        throw new TypeError("cannot compare WeakSet instances");
      }
      if (seen.get(a) === b) {
        return true;
      }
      if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
        return false;
      }
      if (_isKeyedCollection(a) && _isKeyedCollection(b)) {
        if (a.size !== b.size) {
          return false;
        }

        let unmatchedEntries = a.size;

        for (const [aKey, aValue] of a.entries()) {
          for (const [bKey, bValue] of b.entries()) {
            /* Given that Map keys can be references, we need
             * to ensure that they are also deeply equal */
            if (
              (aKey === aValue && bKey === bValue && compare(aKey, bKey)) ||
              (compare(aKey, bKey) && compare(aValue, bValue))
            ) {
              unmatchedEntries--;
            }
          }
        }

        return unmatchedEntries === 0;
      }
      const merged = { ...a, ...b };
      for (
        const key of [
          ...Object.getOwnPropertyNames(merged),
          ...Object.getOwnPropertySymbols(merged),
        ]
      ) {
        if (!compare(a && a[key], b && b[key])) {
          return false;
        }
        if (((key in a) && (!(key in b))) || ((key in b) && (!(key in a)))) {
          return false;
        }
      }
      seen.set(a, b);
      if (a instanceof WeakRef || b instanceof WeakRef) {
        if (!(a instanceof WeakRef && b instanceof WeakRef)) return false;
        return compare(a.deref(), b.deref());
      }
      return true;
    }
    return false;
  })(c, d);
};

export const assertEquals = (x, y, message = "") => {
  if (!_isEquals(x, y)) {
    throw new Error(`Assertion failed. ${message}`);
  }
};

export const renderTests = (...tests) =>
  (root) => {
    return import(import.meta.url.replace("test_runner.js", "test.js"))
      .then(() =>
        Promise.all(
          tests.map(({ title, f }, i) => {
            const t = window.document.createElement("iy-test");
            t.setAttribute("title", title);
            root.appendChild(t);

            return new Promise((resolve) =>
              setTimeout(
                () =>
                  deferUntil(t, (e) => !!e.elements.sandbox)
                    .then(() => (t.test = f))
                    .finally(() => resolve()),
                Number(i),
              )
            );
          }),
        )
      );
  };

export const test = (title, f) => ({ title, f });
