import { createComponent } from "../../library/component.js";

const observer = new MutationObserver(
  (ms) =>
    ms.forEach(({ attributeName, target }) => {
      if (attributeName === "value") {
        target.dispatchEvent(new Event("change"));
      }
    }),
);

export const attributeChangedCallback = (_, w, v) =>
  (v !== "" && typeof Number(v) === "number") && v >= 0 && w !== v;

const connectedCallback = (element, render) => {
  element._handleAddButtonClick = render((_, { value }) => ({
    value: ++value,
  }));
  element._handleSubtractButtonClick = render((_, { value }) => ({
    value: --value,
  }));

  observer.observe(element, { attributes: true });

  element.elements.addButton.addEventListener(
    "click",
    element._handleAddButtonClick,
  );
  element.elements.subtractButton.addEventListener(
    "click",
    element._handleSubtractButtonClick,
  );
};

const disconnectedCallback = (element) => {
  element.elements.addButton.removeEventListener(
    "click",
    element._handleAddButtonClick,
  );
  element.elements.subtractButton.removeEventListener(
    "click",
    element._handleSubtractButtonClick,
  );
};

const elements = {
  addButton: (e) => e.shadowRoot.querySelector("ellipse.clickable.add"),
  number: (e) => e.shadowRoot.querySelector("text.number"),
  subtractButton: (e) =>
    e.shadowRoot.querySelector("ellipse.clickable.subtract"),
};

const extend = (Component) => {
  Object.defineProperty(
    Component.prototype,
    "value",
    {
      enumerable: true,
      get() {
        return this.state.value;
      },
      set(x) {
        if (!this.hasAttribute("disabled")) {
          this.setAttribute("value", x);
        }
      },
    },
  );

  return Component;
};

export const render = (e, { value }) => {
  if (!e.elements.number) return;
  e.elements.number.textContent = String(value);
};

export const Stepper = createComponent(
  "iy-stepper",
  render,
  {
    attributeChangedCallback,
    connectedCallback,
    disconnectedCallback,
    elements,
    extend,
    mapAttributeToState: {
      value: Number,
    },
    observedAttributes: ["value"],
    state: { value: 0 },
    templatePath: "./stepper/stepper.html",
  },
);
