import type {
  LayoutType,
  DocumentElement,
  HtmlAttributes,
} from '../../entities';
import { applyHtmlAttributes } from './applyHtmlAttributes';
import { extendHtmlAttributes } from './extendHtmlAttributes';
import type { PageTemplate } from './pageTemplate';
import { DATA_STACK_INDEX } from './constants';

export const stacksToFragment = (
  stacks: DocumentElement<HTMLElement>['stacks'],
  stackAttributes: HtmlAttributes = {},
): DocumentFragment => {
  const stackTemplates: Array<Partial<Record<LayoutType, PageTemplate>>> = [];
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
      return stacksFragment;
    },
    document.createDocumentFragment(),
  );

  return fragmentEl;
};
