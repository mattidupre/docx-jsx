import type { DocumentElement, HtmlAttributes } from '../../entities';
import type { FragmentedStack } from '../../fragmenter/fragmenter';
import { applyHtmlAttributes } from './applyHtmlAttributes';
import { extendHtmlAttributes } from './extendHtmlAttributes';
import { DATA_STACK_INDEX } from './constants';

/**
 * Wraps the content of every stack in an element of its own, which carries
 * the stack's class and data attributes on every page the stack reaches.
 *
 * Page breaks need no markup: a `Break` carries `break-after: page` (or
 * `column` inside columns) and the Fragmenter reads it from the computed
 * style, and a stack that is not continuous starts a page of its own.
 */
export const createStackElements = (
  stacks: DocumentElement<HTMLElement>['stacks'],
  stackAttributes: HtmlAttributes = {},
): Array<FragmentedStack> =>
  stacks.map(
    (
      { content, continuous, innerPageClassName, innerPageDataAttributes },
      stackIndex,
    ) => {
      const stackEl = document.createElement('div');
      applyHtmlAttributes(
        stackEl,
        extendHtmlAttributes(stackAttributes, innerPageDataAttributes, {
          class: innerPageClassName,
          [DATA_STACK_INDEX]: String(stackIndex),
        }),
      );
      stackEl.appendChild(content);
      return { element: stackEl, continuous: stackIndex > 0 && continuous };
    },
  );
