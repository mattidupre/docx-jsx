import { parseUnits, toUnits } from './units';
export const createEl = (innerHtml, attributes = {}) => {
    if (!innerHtml) {
        return null;
    }
    const el = document.createElement('div');
    el.innerHTML = innerHtml;
    for (const attributeName in attributes) {
        el.setAttribute(attributeName, attributes[attributeName]);
    }
    return el;
};
export const createHtml = (innerHtml, attributes = {}) => {
    if (!innerHtml) {
        return null;
    }
    const attributesStr = Object.entries(attributes).reduce((str, [key, value]) => str + `${key}="${value}"`, '');
    return `<div ${attributesStr}>${innerHtml}</div>`;
};
export const getElHeight = (el, baseWidth) => {
    const [widthValue, units] = parseUnits(baseWidth);
    if (!el) {
        return toUnits(0, units);
    }
    const clonedEl = el.cloneNode(true);
    clonedEl.style.visibility = 'hidden';
    clonedEl.style.display = 'block';
    clonedEl.style.position = 'absolute';
    clonedEl.style.width = baseWidth;
    document.body.appendChild(clonedEl);
    const { width, height } = clonedEl.getBoundingClientRect();
    clonedEl.remove();
    return toUnits((widthValue * height) / width, units);
};
export const appendCloneTo = (parentEl, el) => {
    if (!el) {
        return;
    }
    parentEl.appendChild(el.cloneNode(true));
};
//# sourceMappingURL=elements.js.map