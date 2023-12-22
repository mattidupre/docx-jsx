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
