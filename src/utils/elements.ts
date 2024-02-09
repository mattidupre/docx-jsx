import type { Simplify } from 'type-fest';

type HtmlTagName = keyof HTMLElementTagNameMap;

type SvgTagName = Simplify<keyof SVGElementTagNameMap>;

const SVG_TAG_NAMES = [
  'a',
  'animate',
  'animateMotion',
  'animateTransform',
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'script',
  'set',
  'stop',
  'style',
  'svg',
  'switch',
  'symbol',
  'text',
  'textPath',
  'title',
  'tspan',
  'use',
  'view',
] as const satisfies ReadonlyArray<SvgTagName>;

/**
 * Similar to document.createElement but also handles SVG elements.
 * document.createElement('svg'); will otherwise fail silently.
 */
export const createAnyElement = <TTagName extends HtmlTagName | SvgTagName>(
  tagName: TTagName,
) => {
  type TElement = TTagName extends SvgTagName
    ? SVGElement
    : HTMLElementTagNameMap[Exclude<TTagName, SvgTagName>];
  if (SVG_TAG_NAMES.includes(tagName as SvgTagName)) {
    return document.createElementNS(
      'http://www.w3.org/2000/svg',
      tagName,
    ) as unknown as TElement;
  }
  return document.createElement(tagName) as TElement;
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
