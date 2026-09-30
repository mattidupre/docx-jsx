import { styleObjectToString } from '../../utils/css';
import { resolveRemSize, variantNameToClassName } from '../../entities';
import type { HtmlNode } from '../../lib/mapHtmlToDocument';
import { typographyOptionsToStyleVars } from '../../lib/styles';
import { extendHtmlAttributes } from './extendHtmlAttributes';
import { applyHtmlAttributes } from './applyHtmlAttributes';

export const nodeToDom = (node: HtmlNode) => {
  if (node.type === 'text') {
    return document.createTextNode(node.value);
  }

  const children = node.children as ReadonlyArray<Node>;

  if (node.type === 'element') {
    const {
      properties,
      tagName,
      data: {
        parentTagNames,
        elementsContext,
        element: { contentOptions, variant, elementType },
      },
    } = node;

    const { prefixes } = elementsContext.document!;
    const { columnCount } = elementsContext.stack.columns;

    const element =
      tagName === 'svg' || parentTagNames.includes('svg')
        ? document.createElementNS('http://www.w3.org/2000/svg', tagName)
        : document.createElement(tagName);

    applyHtmlAttributes(
      element,
      extendHtmlAttributes(properties, {
        class: variant && variantNameToClassName({ prefixes }, variant),
        style: styleObjectToString({
          ...typographyOptionsToStyleVars({ prefixes }, contentOptions),
          ...(elementType === 'break' && {
            // Note: Column break will not work with FF.
            // see https://bugzilla.mozilla.org/show_bug.cgi?id=1675322
            breakAfter: columnCount > 1 ? 'column' : 'page',
          }),
        }),
      }),
    );

    element.append(...children);

    return element;
  }

  if (node.type === 'root') {
    const {
      data: { elementsContext },
    } = node;

    const {
      stack: {
        columns: { columnCount, columnGap },
      },
    } = elementsContext;

    const element = document.createDocumentFragment();
    if (columnCount > 1) {
      const columnsEl = document.createElement('div');
      columnsEl.style.setProperty('column-count', String(columnCount));
      columnsEl.style.setProperty('column-gap', resolveRemSize(columnGap));
      columnsEl.style.setProperty('column-fill', 'balance');
      columnsEl.append(...children);
      element.append(columnsEl);
    } else {
      element.append(...children);
    }

    return element;
  }

  throw new TypeError('Invalid node type.');
};
