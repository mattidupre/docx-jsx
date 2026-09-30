import { createStyleObject } from '@capsizecss/core';
import { styleObjectToString } from '../../utils/css';
import { isValueInArray } from '../../utils/array';
import {
  COLUMNS_DATA_ATTRIBUTES,
  type FontsConfig,
  PARAGRAPH_TAG_NAMES,
  capHeightToFontSize,
  createLineBoxVars,
  createTypographyVars,
  resolveBlockTypography,
  resolveLineBox,
  resolveLineBoxFont,
  resolveRemSize,
  typographyOptionsToFlat,
  variantNameToClassName,
} from '../../entities';
import type { HtmlElementNode, HtmlNode } from '../../lib/mapHtmlToDocument';
import { toCssPx, typographyOptionsToStyleVars } from '../../lib/styles';
import { extendHtmlAttributes } from './extendHtmlAttributes';
import { applyHtmlAttributes } from './applyHtmlAttributes';

/**
 * The line box a paragraph resolves to, as the custom properties it reads, so
 * that the browser lays it out as Word does: an absolute `line-height` (which
 * every inline inside it inherits rather than scaling by its own size), the
 * font size a `capHeight` stands for, and for a trimmed paragraph capsize's
 * pseudo-element trim, which the fallback rules read where `text-box` is not
 * supported. Any other element only needs the font size of a `capHeight` of
 * its own.
 */
const toLineBoxVars = (
  {
    tagName,
    data: {
      elementsContext,
      element: { contentOptions },
    },
  }: HtmlElementNode,
  fonts: FontsConfig,
) => {
  const { prefixes, variants, defaultTypography } = elementsContext.document;
  const typography = resolveBlockTypography({
    defaultTypography,
    variants,
    tagName,
    variant: elementsContext.variant,
    contentOptions: elementsContext.contentOptions,
  });
  const font = resolveLineBoxFont(fonts, typography);
  const typographyVars = createTypographyVars({ prefixes });

  if (!isValueInArray(tagName, PARAGRAPH_TAG_NAMES)) {
    const { capHeight } = typographyOptionsToFlat(contentOptions);
    return capHeight === undefined
      ? {}
      : typographyVars.encodeCssVars({
          fontSize: toCssPx(capHeightToFontSize(capHeight, font)),
        });
  }

  const lineBox = resolveLineBox(typography, font);
  if (!lineBox) {
    return {};
  }
  const trim =
    lineBox.trim && font.metrics
      ? createStyleObject({
          fontSize: lineBox.fontSize,
          leading: lineBox.lineHeight,
          fontMetrics: font.metrics,
        })
      : undefined;
  return {
    ...typographyVars.encodeCssVars({
      lineHeight: toCssPx(lineBox.lineHeight),
      fontSize:
        typographyOptionsToFlat(typography).capHeight === undefined
          ? undefined
          : toCssPx(lineBox.fontSize),
    }),
    ...createLineBoxVars({ prefixes }).encodeCssVars({
      trim: trim && "''",
      trimCapHeight: trim?.['::before'].marginBottom,
      trimBaseline: trim?.['::after'].marginTop,
    }),
  };
};

/**
 * Maps one node of the document to the DOM. `fonts` overrides the fonts
 * declared on the document, as it does in every target.
 */
export const nodeToDom = (
  node: HtmlNode,
  { fonts: fontsOption }: { fonts: undefined | FontsConfig },
) => {
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
          ...toLineBoxVars(
            node,
            fontsOption ?? elementsContext.document.fonts ?? {},
          ),
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
        columns: { columnCount, columnGap, fill },
      },
    } = elementsContext;

    const element = document.createDocumentFragment();
    // Masonry packs even a single column, so it always has the element the
    // Fragmenter reads the mode from.
    if (columnCount > 1 || fill === 'masonry') {
      const columnsEl = document.createElement('div');
      columnsEl.style.setProperty('column-count', String(columnCount));
      columnsEl.style.setProperty('column-gap', resolveRemSize(columnGap));
      columnsEl.style.setProperty('column-fill', 'balance');
      if (fill === 'masonry') {
        columnsEl.setAttribute(
          COLUMNS_DATA_ATTRIBUTES.dataAttribute('columnFill'),
          fill,
        );
      }
      columnsEl.append(...children);
      element.append(columnsEl);
    } else {
      element.append(...children);
    }

    return element;
  }

  throw new TypeError('Invalid node type.');
};
