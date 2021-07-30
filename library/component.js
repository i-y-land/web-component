window[Symbol.for("iy-templates")] = window[Symbol.for("iy-templates")] || {};

export const StateSymbol = Symbol.for("iy-state");

const factorizeFunctionalComponentClass = () => (
  class FunctionalComponent extends window.HTMLElement {
    constructor(template, state) {
      super();
      this.attachShadow({ mode: "open" });
      this[Symbol.for("iy-attached")] = template;
      this.elements = {};
      this.isAsyncConnected = false;
      template.then(
        (e) => {
          const content = e.cloneNode(true).content;

          while (content.firstElementChild) {
            this.shadowRoot.appendChild(content.firstElementChild);
          }
          this.isAsyncConnected = true;
        },
      );
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
    connectedCallback = () => {},
    disconnectedCallback = () => {},
    elements = {},
    extend = (C) => C,
    mapAttributeToState = {},
    observedAttributes = [],
    state = {},
    template,
    templatePath,
  },
) => {
  const FunctionalComponent = factorizeFunctionalComponentClass();
  const Component = function () {
    return Reflect.construct(
      FunctionalComponent,
      [
        Promise.resolve(
          template &&
              (template instanceof HTMLElement && template || template()) ||
            window[Symbol.for("iy-templates")][templatePath] ||
            (
              window[Symbol.for("iy-templates")][templatePath] = fetch(
                templatePath,
              )
                .then((response) => response.text())
                .then((html) => {
                  const t = {
                    cloneNode() {
                      const e = window.document.createElement("div");
                      e.innerHTML = html;

                      return { content: e };
                    },
                  };
                  return t;
                })
            ),
        )
          .catch((error) => {
            console.error(
              `Could not initalize the component \`${name}\`: ${error.message}`,
            );
          }),
        state,
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

  Object.defineProperties(
    Component.prototype,
    {
      attributeChangedCallback: {
        enumerable: true,
        value: function (name, w, v) {
          if (attributeChangedCallback(name, w, v)) {
            this[StateSymbol] = {
              ...this[StateSymbol],
              [name]: mapAttributeToState[name]
                ? mapAttributeToState[name](v)
                : v,
            };
            window.requestAnimationFrame(() => render(this, this[StateSymbol]));
          }
        },
      },
      connectedCallback: {
        enumerable: true,
        value: function () {
          this[Symbol.for("iy-attached")]
            .then(() => {
              for (const key in elements) {
                this.elements[key] = elements[key](this);
              }

              for (const key of observedAttributes) {
                const value = mapAttributeToState[key]
                  ? mapAttributeToState[key](this.getAttribute(key))
                  : this.getAttribute(key);
                if (value) this[StateSymbol][key] = value;
              }

              connectedCallback(
                this,
                (f) =>
                  (event) => {
                    const s = f(this, this[StateSymbol], event) || {};
                    this[StateSymbol] = { ...this[StateSymbol], ...s };

                    for (const key in s) {
                      if (observedAttributes.includes(key)) {
                        this.setAttribute(key, s[key]);
                      }
                    }
                  },
              );

              window.requestAnimationFrame(() =>
                render(this, this[StateSymbol])
              );
            });
        },
      },
      disconnectedCallback: {
        enumerable: true,
        value: function () {
          disconnectedCallback(this);
        },
      },
      state: {
        get() {
          return this[StateSymbol];
        },
        set() {},
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
      const t1 = setTimeout(reject, d);
      const t2 = setInterval(() => {
        if (f(e)) {
          resolve();
          clearTimeout(t1);
          clearInterval(t2);
        }
      });
    }
  });

export const deferUntilNextFrame = (e, f) =>
  new Promise(
    (resolve) =>
      window.requestAnimationFrame(() => resolve(f && f(e) || undefined)),
  );
