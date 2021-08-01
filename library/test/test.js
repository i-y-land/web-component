import { createComponent, StateSymbol } from "../component.js";

const statuses = ["failed", "idle", "running", "succeeded"];
const dictionary = {
  "failed": "Failed",
  "idle": "Idle",
  "running": "Running",
  "succeeded": "Succeeded",
};

export const attributeChangedCallback = ({ name, oldValue, value }) => (
  ((name === "data-expanded") && ({ expanded: value })) ||
  ((name === "data-status" && statuses.includes(value) && oldValue !== value) &&
    ({ status: value })) ||
  ((name === "data-message") && ({ message: value }))
);

const connectedCallback = (element, render) => {
  element._expandButtonClick = render((_, { expanded }) => ({
    expanded: !expanded,
  }));
  element.elements.expandButton.addEventListener(
    "click",
    element._expandButtonClick,
  );
};

const disconnectedCallback = (element) => {
  element.elements.expandButton.removeEventListener(
    "click",
    element._expandButtonClick,
  );
};

const elements = {
  sandbox: (e) => e.shadowRoot.querySelector(".sandbox"),
  expandButton: (e) => e.shadowRoot.querySelector(`button[name="expand"]`),
  statusText: (e) => e.shadowRoot.querySelector(".status"),
  titleText: (e) => e.shadowRoot.querySelector(".title"),
  toast: (e) => e.shadowRoot.querySelector(".toast"),
};

const extend = (Component) => {
  Object.defineProperties(
    Component.prototype,
    {
      "expanded": {
        enumerable: true,
        get() {
          return this[StateSymbol].expanded;
        },
        set(x) {
          this.dataset.expanded = x;
        },
      },
      "status": {
        enumerable: true,
        get() {
          return this[StateSymbol].expanded;
        },
        set(x) {
          if (statuses.includes(x)) {
            this.dataset.status = x;
          }
        },
      },
      "test": {
        enumerable: true,
        get() {
          return this[StateSymbol].test;
        },
        set(f) {
          this.dataset.status = "running";
          const t = Date.now();

          new Promise((resolve, reject) => {
            try {
              const r = f(this.elements.sandbox);

              if (r instanceof Promise) {
                r.then(resolve, reject);
              } else {
                resolve(r);
              }
            } catch (e) {
              reject(e);
            }
          })
            .then(
              () => {
                this.dataset.runTime = String(Date.now() - t);
                this.dataset.status = "succeeded";
              },
              (e) => {
                this.dataset.runTime = String(Date.now() - t);
                this.dataset.status = "failed";
                this.dataset.message = e.message;
                this.dataset.meta = e;
                console.error(this.dataset.meta);
              },
            );
        },
      },
    },
  );
  return Component;
};

export const render = (e, { message, status }) => {
  const { titleText, sandbox, statusText, toast } = e.elements;

  statusText.children[1].textContent = dictionary[status];

  if (status === "succeeded" || status === "failed") {
    sandbox.querySelector(".time").textContent = `${e.dataset.runTime}ms`;
    if (e.dataset.runTime >= 500) e.dataset.results = "slow";
    else if (e.dataset.runTime >= 1000) e.dataset.results = "very-slow";
  }

  titleText.textContent = e.getAttribute("title");

  if (message) {
    toast.classList.add("--visible");
    toast.querySelector(".toast__message").innerText = (e.dataset.meta)
      ? `${message}\n${e.dataset.meta}`
      : message;
  }
};

export const Test = createComponent(
  "iy-test",
  render,
  {
    attributeChangedCallback,
    connectedCallback,
    disconnectedCallback,
    elements,
    extend,
    mapAttributeToState: {
      "data-expanded": (v) =>
        (typeof v === "string") ? !["false", "0"].includes(v) : !!v,
    },
    observedAttributes: ["data-expanded", "data-message", "data-status"],
    state: { expanded: false, message: null, status: "idle", test: null },
    templatePath: import.meta.url.replace("test.js", "test.html"),
  },
);
