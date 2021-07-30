import { createComponent } from "../../library/component.js";

export const calculatePosition = (value, { offset, radius, width }) => {
  const ratio = Math.floor(width * value);

  return value < 0.09
    ? Math.max(ratio, radius)
    : Math.min(width - (radius - offset), ratio);
};

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
  _,
  w,
  v,
) => (w >= 0 && w <= 1 && v !== w);

const connectedCallback = (element, render) => {
  element._handleMouseMove = render((e, _, { clientX }) => {
    if (e.dataset.drag !== "true") return;
    const { track } = e.elements;
    const box = track.getBoundingClientRect();
    const r = (clientX - box.x) / box.width;

    return { value: r < 0 ? 0 : r > 1 ? 1 : r };
  });
  element._handleMouseUp = render((e) => {
    e._dragElement = null;
    e.dataset.drag = "false";
    document.removeEventListener("mouseup", e._handleMouseUp);
    document.removeEventListener("mousemove", e._handleMouseMove);

    return {};
  });
  element._handleMouseDown = render((e, _, { target }) => {
    e._dragElement = target;
    e.dataset.drag = "true";
    document.addEventListener("mouseup", e._handleMouseUp);
    document.addEventListener("mousemove", e._handleMouseMove);

    return {};
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
    { offset, radius, width: box.width },
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
      value: Number,
    },
    observedAttributes: ["value"],
    state: { value: "0" },
    templatePath: "./slider/slider.html",
  },
);
