import type { Simplify } from 'type-fest';

type HtmlTagName = Simplify<keyof HTMLElementTagNameMap>;

type SvgTagName = Simplify<keyof SVGElementTagNameMap>;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Similar to document.createElement but also handles SVG elements.
 * document.createElement('svg'); will otherwise fail silently.
 */
export const createElementChild = <TTagName extends HtmlTagName | SvgTagName>(
  parentElement: Element,
  tagName: TTagName,
) => {
  type TElement = TTagName extends HtmlTagName
    ? HTMLElementTagNameMap[Exclude<TTagName, SvgTagName>]
    : SVGElementTagNameMap[Exclude<TTagName, HtmlTagName>];
  if (tagName === 'svg' || parentElement.namespaceURI === SVG_NAMESPACE) {
    return document.createElementNS(
      SVG_NAMESPACE,
      tagName,
    ) as unknown as TElement;
  }
  return document.createElement(tagName) as TElement;
};

/** Get an element's size including scrollbars and margins */
export const getElementOuterSize = (element: HTMLElement) => {
  if (!element.isConnected) {
    throw new Error('Element not attached to DOM');
  }
  const { offsetWidth, offsetHeight } = element;
  const { marginTop, marginRight, marginBottom, marginLeft } =
    window.getComputedStyle(element);
  return {
    width:
      offsetWidth +
      Number.parseInt(marginLeft, 10) +
      Number.parseInt(marginRight, 10),
    height:
      offsetHeight +
      Number.parseInt(marginTop, 10) +
      Number.parseInt(marginBottom, 10),
  };
};

/** Get an element's inner size excluding padding. */
export const getElementInnerSize = (element: HTMLElement) => {
  if (!element.isConnected) {
    throw new Error('Element not attached to DOM');
  }
  const { clientWidth, clientHeight } = element;
  const { paddingTop, paddingRight, paddingLeft, paddingBottom } =
    window.getComputedStyle(element);
  return {
    width:
      clientWidth -
      Number.parseInt(paddingLeft, 10) -
      Number.parseInt(paddingRight, 10),
    height:
      clientHeight -
      Number.parseInt(paddingTop, 10) -
      Number.parseInt(paddingBottom, 10),
  };
};

// import { type UnitsNumber, parseUnits, toUnits } from './units';

// export const createEl = (
//   innerHtml: false | string,
//   attributes: Record<string, any> = {},
// ): null | HTMLElement => {
//   if (!innerHtml) {
//     return null;
//   }
//   const el = document.createElement('div');
//   el.innerHTML = innerHtml;
//   for (const attributeName in attributes) {
//     el.setAttribute(attributeName, attributes[attributeName]);
//   }
//   return el;
// };

// export const createHtml = (
//   innerHtml: false | string,
//   attributes: Record<string, any> = {},
// ): null | string => {
//   if (!innerHtml) {
//     return null;
//   }
//   const attributesStr = Object.entries(attributes).reduce(
//     (str, [key, value]) => str + `${key}="${value}"`,
//     '',
//   );
//   return `<div ${attributesStr}>${innerHtml}</div>`;
// };

// export const getElHeight = (el: null | HTMLElement, baseWidth: UnitsNumber) => {
//   const [widthValue, units] = parseUnits(baseWidth);

//   if (!el) {
//     return toUnits(0, units);
//   }

//   const clonedEl = el.cloneNode(true) as HTMLElement;

//   clonedEl.style.visibility = 'hidden';
//   clonedEl.style.display = 'block';
//   clonedEl.style.position = 'absolute';
//   clonedEl.style.width = baseWidth;
//   document.body.appendChild(clonedEl);

//   const { width, height } = clonedEl.getBoundingClientRect();
//   clonedEl.remove();

//   return toUnits((widthValue * height) / width, units);
// };

// export const appendCloneTo = (
//   parentEl: HTMLElement,
//   el: null | HTMLElement,
// ) => {
//   if (!el) {
//     return;
//   }
//   parentEl.appendChild(el.cloneNode(true));
// };
