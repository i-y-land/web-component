import { createComponent } from "../../library/component.js";

export const calculatePosition = (value, { max, min, offset, radius, width }) =>
  Math.max(
    Math.floor(((value - min) * width) / (max - min + 1)),
    radius
  );

export const positionThumb = (x, { thumb, thumbOuter, notch }) => {
  const v = Number(thumb.getAttribute("cx"));
  if (x === v) return;
  thumb.setAttribute("cx", String(x));
  thumbOuter.setAttribute("cx", String(x));
  notch.setAttribute("x1", String(x));
  notch.setAttribute("x2", String(x));
};

export const positionActiveTrack = (x1, x2, activeTrack) => {
  activeTrack.setAttribute("x", String(x1));
  activeTrack.setAttribute("width", String(x2 - x1));
};

const observer = new MutationObserver(
  (ms) =>
    ms.forEach(({ attributeName, target }) => {
      if (attributeName === "value") {
        target.dispatchEvent(new Event("change"));
      }
    }),
);

export const attributeChangedCallback = (
  { name, oldValue, value },
  _,
  { max, min }
) => {
  if (name === "value") {
    if (value >= min && value <= max) {
      return { value };
    } else {
      return { value: oldValue };
    }
  }
};

const connectedCallback = (element, render) => {
  element._handleMouseMove = render((e, { max, min }, { clientX }) => {
    if (e.dataset.drag !== "true") return;
    const { track } = e.elements;
    const box = track.getBoundingClientRect();
    const r = (clientX - box.x) / box.width;

    return {
      value: r < 0 ? min : r > 1 ? max : Math.floor(r * (max - min + 1) + min)
    };
  });
  element._handleMouseUp = render((e) => {
    e._dragElement = null;
    e.dataset.drag = "false";
    document.removeEventListener("mouseup", e._handleMouseUp);
    document.removeEventListener("mousemove", e._handleMouseMove);
  });
  element._handleMouseDown = render((e, _, { target }) => {
    e._dragElement = target;
    e.dataset.drag = "true";
    document.addEventListener("mouseup", e._handleMouseUp);
    document.addEventListener("mousemove", e._handleMouseMove);
  });

  observer.observe(element, { attributes: true });

  element.elements.thumb.addEventListener(
    "mousedown",
    element._handleMouseDown,
  );
};

const disconnectedCallback = (element) => {
  element.elements.thumb.removeEventListener(
    "mousedown",
    element._handleMouseMove,
  );
  document.removeEventListener("mouseup", this._handleMouseUp);
  document.removeEventListener("mousemove", this._handleMouseMove);
};

const elements = {
  activeTrack: (e) => e.shadowRoot.querySelector(".active-track"),
  thumb: (e) => e.shadowRoot.querySelector(".thumb"),
  notch: (e) => e.shadowRoot.querySelector(".notch"),
  thumbOuter: (e) => e.shadowRoot.querySelector(".thumb-outer"),
  track: (e) => e.shadowRoot.querySelector(".runnable-track"),
};

const extend = (Component) => {
  Object.defineProperties(
    Component.prototype,
    {
      max: {
        enumerable: true,
        get() {
          return this.state.max;
        },
        set(x) {
          if (!this.hasAttribute("disabled")) {
            this.setAttribute("max", x);
          }
        },
      },
      min: {
        enumerable: true,
        get() {
          return this.state.min;
        },
        set(x) {
          if (!this.hasAttribute("disabled")) {
            this.setAttribute("min", x);
          }
        },
      },
      value: {
        enumerable: true,
        get() {
          return this.state.value;
        },
        set(x) {
          if (!this.hasAttribute("disabled")) {
            this.setAttribute("value", x);
          }
        },
      }
    },
  );

  return Component;
};

export const render = (e, { max, min, value }) => {
  if (!e.parentElement) return;

  const { activeTrack, track } = e.elements;

  if (!track) return;

  const box = track.getBoundingClientRect();

  const { notch, thumb, thumbOuter } = e.elements;
  const strokeWidth = Number(thumb.getAttribute("stroke-width"));
  const offset = Number(thumb.getAttribute("rx")) + strokeWidth;
  const radius = Number(thumbOuter.getAttribute("rx"));
  const x = calculatePosition(
    value,
    {
      max,
      min,
      offset,
      radius,
      width: box.width
    },
  );
  window.requestAnimationFrame(() => {
    positionActiveTrack(radius - offset, x, activeTrack);
    positionThumb(
      x,
      {
        thumb: thumb,
        thumbOuter: thumbOuter,
        notch: notch,
      },
    );
  });
};

export const Slider = createComponent(
  "iy-slider",
  render,
  {
    attributeChangedCallback,
    connectedCallback,
    disconnectedCallback,
    elements,
    extend,
    mapAttributeToState: {
      max: Number,
      min: Number,
      value: Number,
    },
    observedAttributes: ["max", "min", "value"],
    state: { max: 100, min: 0, value: 0 },
    templatePath: "./slider/slider.html",
  },
);
