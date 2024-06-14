import type { HtmlAttributes } from '../../entities';

export const applyHtmlAttributes = (
  element: SVGElement | HTMLElement,
  attributes: HtmlAttributes,
) => {
  for (const attributeName in attributes) {
    if (attributes[attributeName]) {
      element.setAttribute(attributeName, attributes[attributeName]!);
    }
  }
};
