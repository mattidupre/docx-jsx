import type {
  LayoutType,
  DocumentElement,
  StyleSheetsValue,
  TagName,
} from '../../entities';
import { Pager } from '../../utils/pager';
import { styleObjectToString, toCssStyleSheets } from '../../utils/css';
import { mapHtmlToDocument, type HtmlNode } from '../mapHtmlToDocument';
import {
  variantNameToClassName,
  typographyOptionsToStyleVars,
  createStyleString,
} from '../styles';
import { createAnyElement } from '../../utils/elements';
import { PageTemplate } from './pageTemplate';
import { extendHtmlAttributes } from './extendHtmlAttributes';

export type DocumentDom = DocumentElement<HTMLElement>;

const objToDom = (node: HtmlNode) => {
  if (node.type === 'text') {
    return document.createTextNode(node.value);
  }

  const children = node.children as ReadonlyArray<Node>;

  if (node.type === 'element') {
    const {
      properties,
      tagName,
      data: {
        elementsContext,
        element: { contentOptions, variant },
      },
    } = node;

    const { prefixes } = elementsContext.document!;

    const attributes = extendHtmlAttributes(properties, {
      class: variant && variantNameToClassName({ prefixes }, variant),
      style: styleObjectToString(
        typographyOptionsToStyleVars({ prefixes }, contentOptions),
      ),
    });

    // document.createElement('svg' | 'polygon' | etc); otherwise fails
    const element = createAnyElement(tagName);
    for (const attributeName in attributes) {
      if (attributes[attributeName]) {
        element.setAttribute(attributeName, attributes[attributeName]!);
      }
    }
    element.append(...children);

    return element;
  }

  if (node.type === 'root') {
    const element = document.createDocumentFragment();
    element.append(...children);
    return element;
  }

  throw new TypeError('Invalid node type.');
};

export type HtmlToDomOptions = {
  initialStyleSheets?: ReadonlyArray<StyleSheetsValue>;
  styleSheets?: ReadonlyArray<StyleSheetsValue>;
  onDocument?: (document: DocumentDom) => void;
};

export const htmlToDom = async (
  html: string,
  {
    initialStyleSheets: initialStyleSheetsOption = [],
    styleSheets: styleSheetsOption = [],
    onDocument,
  }: HtmlToDomOptions = {},
): Promise<HTMLElement> => {
  const documentObj = mapHtmlToDocument<HTMLElement>(
    html,
    objToDom,
  ) satisfies DocumentDom;

  onDocument?.(documentObj);

  const { size, stacks: stacksOptions, prefixes } = documentObj;

  const documentStyleCss = createStyleString(documentObj);

  const styleSheets = await toCssStyleSheets(
    ...[...initialStyleSheetsOption, documentStyleCss, ...styleSheetsOption],
  );

  // const perf = performance.now();

  // Create a temporary element in which to calculate / render pages. Pager and
  // PageTemplate operate in their own respective Shadow DOMs.
  const renderEl = createAnyElement('div');
  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  const prefix = `prefix-${Math.random()}`.replace('.', '');
  const stackIndexAttribute = `data-${prefix}-stack-index`;

  const stackTemplates: Array<Partial<Record<LayoutType, PageTemplate>>> = [];
  const mergedStacksEl = stacksOptions.reduce(
    (stacksFragment, { content, continuous }, stackIndex) => {
      stackTemplates[stackIndex] = {};
      const stackEl = createAnyElement('div');
      stackEl.setAttribute(stackIndexAttribute, String(stackIndex));
      if (stackIndex > 0 && !continuous) {
        stackEl.setAttribute('data-break-before', 'page');
      }
      stackEl.appendChild(content);
      stacksFragment.appendChild(stackEl);
      return stacksFragment;
    },
    document.createDocumentFragment(),
  );

  // renderEl.appendChild(mergedStacksEl);

  const pager = new Pager({ styles: styleSheets });

  const extendedTemplates: Array<PageTemplate> = [];
  {
    let isFirst = true;
    let stackIndex = 0;
    const unextendedTemplates: Array<PageTemplate> = [];
    await pager.toPages({
      content: mergedStacksEl,
      onPageStart: ({ pageIndex, setPageVars }) => {
        const {
          margin,
          layouts,
          innerPageClassName,
          outerPageClassName,
          continuous,
        } = stacksOptions[stackIndex];

        const layoutType: LayoutType =
          isFirst && !continuous ? 'first' : 'subsequent';

        let template = stackTemplates[stackIndex][layoutType];

        if (!template) {
          template = stackTemplates[stackIndex][layoutType] ??=
            new PageTemplate({
              prefixes,
              size,
              margin,
              header: layouts[layoutType]?.header,
              footer: layouts[layoutType]?.footer,
              styles: styleSheets,
              outerClassName: outerPageClassName,
              innerClassName: innerPageClassName,
            });

          // TODO: Do this in PageTemplate constructor.
          renderEl.appendChild(template.element);

          stackTemplates[stackIndex][layoutType] = template;
        }

        const { width, height } = template.contentSize;

        setPageVars({
          // PagerJS doesn't like 0 margins so use 0.5in margins
          // temporarily.
          width: `calc(${width} + 1in)`,
          height: `calc(${height} + 1in)`,
          marginTop: '0.5in',
          marginRight: '0.5in',
          marginBottom: '0.5in',
          marginLeft: '0.5in',
        });

        unextendedTemplates[pageIndex] = template;
      },
      onPageBreak: ({ breakElement }) => {
        const element =
          breakElement instanceof HTMLElement
            ? breakElement
            : breakElement.parentElement!;
        if (element.hasAttribute(stackIndexAttribute)) {
          isFirst = true;
          stackIndex = Number.parseInt(
            element.getAttribute(stackIndexAttribute)!,
            10,
          );
        } else {
          isFirst = false;
          stackIndex = Number.parseInt(
            element
              .closest(`[${stackIndexAttribute}]`)!
              .getAttribute(stackIndexAttribute)!,
            10,
          );
        }
      },
      onPageRendered: ({ pageIndex, contentElement }) => {
        // Note that contentElement is NOT cloned. It will be detached from
        // pager.
        extendedTemplates.push(
          unextendedTemplates[pageIndex].extend({
            content: contentElement.querySelectorAll(
              `[${stackIndexAttribute}] > *`,
            ),
          }),
        );
      },
    });
  }

  const pagesEl = createAnyElement('div');

  const pageCount = extendedTemplates.length;
  extendedTemplates.forEach((template, pageIndex) => {
    template.replaceCounters({
      pageNumber: pageIndex + 1,
      pageCount,
    });
    pagesEl.append(template.element);
  });

  renderEl.remove();

  return pagesEl;
};
