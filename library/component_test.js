import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";
import {
  createComponent,
  deferUntil,
  deferUntilNextFrame,
  factorizeAttributeChangedCallback,
  fetchTemplate,
  StateSymbol,
} from "./component.js";

window.HTMLElement = class {
  #state = {};
  constructor() {
    this.observedAttributes = this.constructor.observedAttributes;
  }
  attachShadow() {
    this.shadowRoot = new window.HTMLElement();
  }
  getAttribute(n) {
    return this.#state[n];
  }
  setAttribute(n, v) {
    if (Reflect.get(this, "observedAttributes")?.includes(n)) {
      this.attributeChangedCallback(n, this.#state[n], v);
    }
    this.#state[n] = v;
  };
};
window.requestAnimationFrame = (f) => setTimeout(f);

const noop = (_) => undefined;

const factorizeHTMLElement = (f = (x) => x) => {
  return f(new window.HTMLElement());
};

const factorizeSpy = (f = noop) => {
  let xs = [];
  let i = 0;
  let called = false;
  return [
    (...as) => {
      called = true;
      xs.push(as);
      i++;

      return f(...as);
    },
    Object.defineProperties(
      (g) => {
        xs.forEach((ys, i, zs) => g(...ys, i, zs));
      },
      {
        callCount: {
          get: () => i
        },
        called: {
          get: () => called,
        }
      }
    ),
  ];
};

window.document = window.document || {};

window.document.createElement = (_) =>
  factorizeHTMLElement(
    (t) =>
      Object.defineProperties(
        t,
        {
          "innerHTML": {
            set(x) {
              noop(x);
            },
          },
        },
      ),
  );

const withStaticServer = (f) =>
  () => {
    const p = Deno.run({
      cmd:
        "deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts --port 8080"
          .split(" "),
      cwd: `${Deno.cwd()}/library/assets_test/`,
      env: { LOG_LEVEL: "ERROR", "NO_COLOR": "1" },
      stdout: "null",
      stderr: "piped",
    });

    return new Promise((resolve, reject) => {
      setTimeout(
        () => f().then(resolve, reject),
        1000,
      );
      p.stderrOutput().then(reject);
    })
      .finally(() => p.close());
  };

Deno.test(
  "deferUntil",
  () => {
    const e = { i: 0 };

    const t = setInterval(
      () => ++e.i,
      100
    );

    return deferUntil(e, (e) => e.i > 20)
      .then((e) => {
        assert(e.i > 20);
        clearInterval(t);
      });
  }
);

Deno.test(
  "deferUntilNextFrame",
  () => deferUntilNextFrame()
);

Deno.test(
  "fetchTemplate: With template",
  () => {
    const template = factorizeHTMLElement();
    return fetchTemplate("iy-demo", { template })
      .then((t) => {
        assert(t === template);
      })
      .finally(() => {
        window[Symbol.for("iy-templates")] = {};
      });
  },
);

Deno.test(
  "fetchTemplate: With template as function",
  () => {
    const template = factorizeHTMLElement();
    return fetchTemplate("iy-demo", { template: () => template })
      .then((t) => {
        assert(t === template);
      })
      .finally(() => {
        window[Symbol.for("iy-templates")] = {};
      });
  },
);

Deno.test(
  "fetchTemplate: With template path",
  withStaticServer(
    () =>
      fetchTemplate("iy-demo", {
        templatePath: "http://localhost:8080/demo.html",
      })
        .then((t) => {
          assert(t.cloneNode().content instanceof window.HTMLElement);
        })
        .finally(() => {
          window[Symbol.for("iy-templates")] = {};
        }),
  ),
);

Deno.test(
  "factorizeAttributeChangedCallback: I update the state and the component is rendered",
  () => {
    const e = factorizeHTMLElement((e) =>
      Object.defineProperty(e, StateSymbol, {
        enumerable: true,
        value: { value: 42 },
        writable: true,
      })
    );
    const [attributeChangedCallbackSpy, assertAttributeChangedCallbackSpy] =
      factorizeSpy(({ value }) => ({ value }));
    const [renderSpy, assertRenderSpy] = factorizeSpy();

    const f = factorizeAttributeChangedCallback({
      attributeChangedCallback: attributeChangedCallbackSpy,
      mapAttributeToState: {
        value: Number,
      },
      observedAttributes: ["value"],
      render: renderSpy,
    });

    f(e, { name: "value", oldValue: 42, value: 24 });

    assertAttributeChangedCallbackSpy(
      ({ name, oldValue, value }, _e, s) => {
        assert(name === "value");
        assert(oldValue === 42);
        assert(value === 24);
        assert(_e === e);
        assertEquals(s, { value: 42 });
      },
    );

    return deferUntil(e, () => assertRenderSpy.called)
      .then(() => {
        assertRenderSpy((e, s) => {
          assertEquals(s, { value: 24 });
        });
      });
  },
);

Deno.test(
  "factorizeAttributeChangedCallback: I don't update the state",
  () => {
    const e = factorizeHTMLElement((e) =>
      Object.defineProperty(e, StateSymbol, {
        enumerable: true,
        value: { value: 42 },
        writable: true,
      })
    );
    const [attributeChangedCallbackSpy, assertAttributeChangedCallbackSpy] =
      factorizeSpy(() => false);

    const f = factorizeAttributeChangedCallback({
      attributeChangedCallback: attributeChangedCallbackSpy,
      mapAttributeToState: {
        value: Number,
      },
      observedAttributes: ["value"],
      render: noop,
    });

    f(e, { name: "value", oldValue: 42, value: 24 });

    assertAttributeChangedCallbackSpy(
      ({ name, oldValue, value }, _e, s) => {
        assert(name === "value");
        assert(oldValue === 42);
        assert(value === 24);
        assert(_e === e);
        assertEquals(s, { value: 42 });
      },
    );

    return deferUntil(e, () => assertRenderSpy.called)
      .then(
        () => {
          throw new Error("Unexpectedly resolved");
        },
        () => {},
      );
  },
);

Deno.test(
  "createComponent",
  () => {
    const Component = createComponent("iy-demo", () => {});
    const e = new Component();
    assert(e instanceof window.HTMLElement);

    setTimeout(() => e.connectedCallback());

    return deferUntil(e, (e) => e.isAsyncConnected)
      .then(deferUntilNextFrame);
  },
);

Deno.test(
  "createComponent: with `attributeChangedCallback``",
  () => {
    const [attributeChangedCallbackSpy, assertAttributeChangedCallbackSpy] =
      factorizeSpy(({ value }) => ({ value }));
    const [renderSpy, assertRenderSpy] = factorizeSpy();
    const Component = createComponent(
      "iy-demo",
      renderSpy,
      {
        attributeChangedCallback: attributeChangedCallbackSpy,
        observedAttributes: ["value"],
        state: { value: 42 },
      }
    );
    const e = new Component();

    setTimeout(() => e.connectedCallback());

    return deferUntil(e, (e) => e.isAsyncConnected)
      .then(() => {
        e.setAttribute("value", "24");

        assert(assertAttributeChangedCallbackSpy.called);
        assert(assertAttributeChangedCallbackSpy.callCount === 1);
        assertAttributeChangedCallbackSpy(
          ({ name, oldValue, value }, _e, s) => {
            assert(name === "value");
            assert(oldValue === undefined);
            assert(value === "24");
            assert(_e === e);
            assertEquals(s, { value: 42 });
          }
        );
      })
      .then(() => deferUntil(e, () => assertRenderSpy.called))
      .then(() => {
        assert(assertRenderSpy.callCount === 1);
        assertRenderSpy((_e, s) => {
          assert(_e === e);
          assertEquals(s, { value: "24" });
        });
      });
  },
);

Deno.test(
  "createComponent: with `connectedCallback` and async render",
  () => {
    let t;
    const [renderSpy, assertRenderSpy] = factorizeSpy();
    const Component = createComponent(
      "iy-demo",
      renderSpy,
      {
        attributeChangedCallback: ({ value }) => ({ value }),
        connectedCallback: (_, render) => {
          const boundRender = render((_, { value }) => value > 0 && ({ value: --value }));
          t = setInterval(boundRender, 100);
        },
        observedAttributes: ["value"],
        state: { value: 12 },
      }
    );
    const e = new Component();

    setTimeout(() => e.connectedCallback());

    return deferUntil(e, (e) => e.state.value === 0, 1000 * 12)
      .then(() => {
        assert(assertRenderSpy.callCount === 12);
        assertRenderSpy((e, s, i) => assertEquals(s.value, 12 - i));
      })
      .finally(() => {
        clearInterval(t);
      });
  },
);
