import {
  type LayoutType,
  type DocumentElement,
  type HtmlAttributes,
  selectDomElement,
} from '../../entities';
import { applyHtmlAttributes } from './applyHtmlAttributes';
import { extendHtmlAttributes } from './extendHtmlAttributes';
import type { PageTemplate } from './pageTemplate';
import { DATA_STACK_INDEX } from './constants';

/**
 * The `break-after` value `nodeToDom` writes on a `Break` for a page break.
 * A `Break` inside a multi-column stack is a column break instead, which CSS
 * multicol performs on its own.
 */
const PAGE_BREAK_AFTER = 'page';

/**
 * The next element in document order that is not a descendant of `element`,
 * i.e. what pagedjs's own `elementAfter` finds for a `break-after` declaration.
 * A break that is the last child of its parent therefore applies to the
 * parent's next sibling -- including the first element of the next stack -- and
 * one that ends the document applies to nothing.
 */
const elementAfter = (element: Element): undefined | Element => {
  for (
    let current: null | Element = element;
    current;
    current = current.parentElement
  ) {
    const sibling = current.nextElementSibling;
    if (sibling) {
      return sibling;
    }
  }
  return undefined;
};

/**
 * The blank page a `Break` at the very end of the document opens.
 *
 * Word ends such a document with a trailing blank page, and the DOCX target
 * emits the `w:br` that produces it, so the DOM and PDF targets have to agree.
 * pagedjs only breaks *onto* an element, so with nothing left to lay out the
 * break was silently dropped; this carrier is that element. It holds one empty
 * line, which is exactly what Word's trailing page contains.
 */
const createTrailingBreakCarrier = (): HTMLElement => {
  const carrierEl = document.createElement('div');
  carrierEl.style.setProperty('height', '1em');
  return carrierEl;
};

/**
 * Rewrites every page `Break` into the attributes pagedjs's chunker reads.
 *
 * `Layout.shouldBreak` only ever consults `data-break-before` and
 * `data-previous-break-after` (`utils/dom.js` `needsBreakBefore` /
 * `needsPreviousBreakAfter`); the `break-after` declaration `nodeToDom` writes
 * is picked up by the `Breaks` CSS polisher, which reads parsed stylesheets and
 * never inline styles. Without this pass a `Break` is a no-op in the DOM and
 * PDF targets while the DOCX target emits a real `w:br`.
 *
 * The attribute pair is the one pagedjs writes itself for `break-after: page`:
 * the value on the breaking element, and `data-previous-break-after` on the
 * element that has to open the next page.
 */
const applyPageBreakAttributes = (stackEl: Element): void => {
  for (const breakEl of selectDomElement(stackEl, 'break')) {
    if (
      !(breakEl instanceof HTMLElement) ||
      breakEl.style.getPropertyValue('break-after') !== PAGE_BREAK_AFTER
    ) {
      continue;
    }
    breakEl.setAttribute('data-break-after', PAGE_BREAK_AFTER);
    const nextEl =
      elementAfter(breakEl) ??
      stackEl.appendChild(createTrailingBreakCarrier());
    nextEl.setAttribute('data-previous-break-after', PAGE_BREAK_AFTER);
  }
};

export const stacksToFragment = (
  stacks: DocumentElement<HTMLElement>['stacks'],
  stackAttributes: HtmlAttributes = {},
): DocumentFragment => {
  const stackTemplates: Array<Partial<Record<LayoutType, PageTemplate>>> = [];
  const stackElements: Array<HTMLElement> = [];
  const fragmentEl = stacks.reduce(
    (
      stacksFragment,
      { content, continuous, innerPageClassName, innerPageDataAttributes },
      stackIndex,
    ) => {
      stackTemplates[stackIndex] = {};
      const stackEl = document.createElement('div');
      applyHtmlAttributes(
        stackEl,
        extendHtmlAttributes(stackAttributes, innerPageDataAttributes, {
          class: innerPageClassName,
          [DATA_STACK_INDEX]: String(stackIndex),
          ...(stackIndex > 0 &&
            !continuous && {
              'data-break-before': 'page',
            }),
        }),
      );
      stackEl.appendChild(content);
      stacksFragment.appendChild(stackEl);
      stackElements.push(stackEl);
      return stacksFragment;
    },
    document.createDocumentFragment(),
  );

  // Every stack is attached before this runs, so a break at the end of one
  // stack can still reach the first element of the next one.
  stackElements.forEach(applyPageBreakAttributes);

  return fragmentEl;
};
