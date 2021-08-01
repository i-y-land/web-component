window[Symbol.for("iy-templates")] = window[Symbol.for("iy-templates")] || {};

export const StateSymbol = Symbol.for("iy-state");

export const factorizeAttributeChangedCallback = (
  { attributeChangedCallback, mapAttributeToState, observedAttributes, render },
) =>
  (e, { name, oldValue, value }) => {
    const s = attributeChangedCallback(
      {
        name: name,
        oldValue: mapAttributeToState.hasOwnProperty(name)
          ? mapAttributeToState[name](oldValue)
          : oldValue,
        value: mapAttributeToState.hasOwnProperty(name)
          ? mapAttributeToState[name](value) : value,
      },
      e,
      Object.assign({}, e[StateSymbol]),
    );

    if (s) {
      for (const k in s) {
        e[StateSymbol][k] = s[k];
      }
      window.requestAnimationFrame(() =>
        render(e, Object.assign({}, e[StateSymbol]))
      );
    }
  };

export const fetchTemplate = (name, { template, templatePath }) =>
  Promise.resolve(
    template &&
        (template instanceof HTMLElement && template || template()) ||
      window[Symbol.for("iy-templates")][templatePath] ||
      (
        window[Symbol.for("iy-templates")][templatePath] = fetch(
          templatePath,
        )
          .then((response) => response.text())
          .then((html) => ({
            cloneNode() {
              const e = window.document.createElement("div");
              e.innerHTML = html;

              return { content: e };
            },
          }))
      ),
  )
    .catch((e) => {
      console.error(
        `Could not initalize the component \`${name}\`: ${e.message}`,
      );
    });

const factorizeFunctionalComponentClass = () => (
  class FunctionalComponent extends window.HTMLElement {
    constructor(state, template) {
      super();
      this.attachShadow({ mode: "open" });
      this.elements = {};
      this.isAsyncConnected = false;
      if (template) {
        template.then(
          (e) => {
            const content = e.cloneNode(true).content;

            while (content.firstElementChild) {
              this.shadowRoot.appendChild(content.firstElementChild);
            }

            this.isAsyncConnected = true;
          },
        );
      } else this.isAsyncConnected = true;

      this[StateSymbol] = { ...state };

      return this;
    }
  }
);

export const createComponent = (
  name,
  render,
  {
    attributeChangedCallback = () => false,
    connectedCallback = () => {
    },
    disconnectedCallback = () => {
    },
    elements = {},
    extend = (C) => C,
    mapAttributeToState = {},
    observedAttributes = [],
    state = {},
    template,
    templatePath,
  } = {},
) => {
  const FunctionalComponent = factorizeFunctionalComponentClass();
  const Component = function () {
    return Reflect.construct(
      FunctionalComponent,
      [
        state,
        (template || templatePath) && fetchTemplate(name, { template, templatePath }),
      ],
      new.target,
    );
  };

  Object.setPrototypeOf(Component.prototype, FunctionalComponent.prototype);
  Object.setPrototypeOf(Component, FunctionalComponent);

  Object.defineProperty(
    Component,
    "observedAttributes",
    {
      enumerable: true,
      value: observedAttributes,
    },
  );

  const boundAttributeChangedCallback = factorizeAttributeChangedCallback({
    attributeChangedCallback,
    mapAttributeToState,
    observedAttributes,
    render,
  });

  Object.defineProperties(
    Component.prototype,
    {
      attributeChangedCallback: {
        enumerable: true,
        value(name, oldValue, value) {
          boundAttributeChangedCallback(this, { name, oldValue, value });
        },
      },
      connectedCallback: {
        enumerable: true,
        value: function () {
          deferUntil(this, (e) => e.isAsyncConnected)
            .then(() => {
              for (const key in elements) {
                this.elements[key] = elements[key](this);
              }

              for (const key of observedAttributes) {
                const normalizedKey = key.replace(/^data-/, "");
                const value = mapAttributeToState[normalizedKey]
                  ? mapAttributeToState[normalizedKey](
                    this.getAttribute(normalizedKey),
                  )
                  : this.getAttribute(normalizedKey);
                if (value) this[StateSymbol][normalizedKey] = value;
              }

              connectedCallback(
                this,
                (f) =>
                  (event) => {
                    const s =
                      f(this, Object.assign({}, this[StateSymbol]), event) ||
                      {};


                    for (const k in s) {
                      this[StateSymbol][k] = s[k];

                      if (observedAttributes.includes(`data-${k}`)) {
                        this.dataset[k] = s[k];
                      } else if (observedAttributes.includes(k)) {
                        this.setAttribute(k, s[k]);
                      }
                    }
                  },
              );

              return deferUntilNextFrame();
            })
            .then(() => render(this, Object.assign({}, this[StateSymbol])))
            .catch((e) => {
              console.error(
                `Could not connect the component \`${name}\`: ${e.message}`,
              );
            });
        },
      },
      disconnectedCallback: {
        enumerable: true,
        value: function () {
          disconnectedCallback && disconnectedCallback(this);
        },
      },
      state: {
        get() {
          return this[StateSymbol];
        },
        set() {
        },
      },
    },
  );

  window.customElements &&
    window.customElements.define(name, extend(Component));

  return Component;
};

export const deferUntil = (e, f, d = 1000 * 5) =>
  new Promise((resolve, reject) => {
    if (f(e)) resolve();
    else {
      const t1 = setTimeout(() => {
        reject(new Error("Timed out"));
        clearTimeout(t1);
        clearInterval(t2);
      }, d);
      const t2 = setInterval(() => {
        if (f(e)) {
          resolve(e);
          clearTimeout(t1);
          clearInterval(t2);
        }
      });
    }
  });

export const deferUntilNextFrame = () =>
  new Promise(
    (resolve) => window.requestAnimationFrame(() => resolve()),
  );
