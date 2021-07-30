import { createComponent, StateSymbol } from "../component.js";

const statuses = ["failed", "idle", "running", "succeeded"];
const dictionary = {
  "failed": "Failed",
  "idle": "Idle",
  "running": "Running",
  "succeeded": "Succeeded",
};

export const attributeChangedCallback = (name, w, v) =>
  !!v &&
  (
    (name === "expanded" && ["true", "false", "1", "0"].includes(v)) ||
    (name === "status" && statuses.includes(v) && w !== v) ||
    (name === "message")
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
          this.setAttribute("expanded", x);
        },
      },
      "status": {
        enumerable: true,
        get() {
          return this[StateSymbol].expanded;
        },
        set(x) {
          if (statuses.includes(x)) {
            this.setAttribute("status", x);
          }
        },
      },
      "test": {
        enumerable: true,
        get() {
          return this[StateSymbol].test;
        },
        set(f) {
          this.setAttribute("status", "running");
          const t = Date.now();

          Promise.resolve(f(this.elements.sandbox))
            .then(
              () => {
                this.dataset.runTime = String(Date.now() - t);
                this.setAttribute("status", "succeeded");
              },
              (e) => {
                this.dataset.runTime = String(Date.now() - t);
                this.setAttribute("status", "failed");
                this.setAttribute("message", e.message);
                this.dataset.meta = e;
              },
            );
        },
      },
    },
  );
  return Component;
};

export const render = (e, { expanded, message, status }) => {
  const { titleText, sandbox, statusText, toast } = e.elements;

  if (expanded && !e.classList.contains("--expanded")) {
    e.classList.add("--expanded");
  } else if (!expanded && e.classList.contains("--expanded")) {
    e.classList.remove("--expanded");
  }

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

  if (e.dataset.meta) {
    console.error(e.dataset.meta);
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
      expanded: (v) =>
        (typeof v === "string") ? !["false", "0"].includes(v) : !!v,
    },
    observedAttributes: ["expanded", "message", "status"],
    state: { expanded: false, message: null, status: "idle", test: null },
    templatePath: import.meta.url.replace("test.js", "test.html"),
  },
);
