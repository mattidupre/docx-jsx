import type {
  LayoutType,
  DocumentElement,
  StyleSheetsValue,
} from '../../entities';
import { Pager } from '../../utils/pager';
import { toCssStyleSheets } from '../../utils/css';
import { mapHtmlToDocument } from '../../lib/mapHtmlToDocument';
import { createStyleString } from '../../lib/styles';
import { PageTemplate } from './pageTemplate';
import { stacksToFragment } from './stacksToFragment';
import { nodeToDom } from './nodeToDom';
import { DATA_STACK_INDEX } from './constants';

export type DocumentDom = DocumentElement<HTMLElement>;

export type HtmlToDomOptions = {
  initialStyleSheets?: ReadonlyArray<StyleSheetsValue>;
  styleSheets?: ReadonlyArray<StyleSheetsValue>;
  pageClassName?: string;
  onDocument?: (document: DocumentDom) => void;
};

export const htmlToDom = async (
  html: string,
  {
    initialStyleSheets: initialStyleSheetsOption = [],
    styleSheets: styleSheetsOption = [],
    pageClassName,
    onDocument,
  }: HtmlToDomOptions = {},
): Promise<HTMLElement> => {
  const documentObj = mapHtmlToDocument<HTMLElement>(
    html,
    nodeToDom,
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
  const renderEl = document.createElement('div');
  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  const stackTemplates: Array<Partial<Record<LayoutType, PageTemplate>>> = [];
  const mergedStacksEl = stacksToFragment(stacksOptions, {});

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
          outerPageDataAttributes,
          innerPageDataAttributes,
        } = stacksOptions[stackIndex];

        const layoutType: LayoutType = isFirst ? 'first' : 'subsequent';

        const stackTemplate = (stackTemplates[stackIndex] ??= {});

        if (!stackTemplate[layoutType]) {
          const template = new PageTemplate({
            prefixes,
            size,
            margin,
            header: layouts[layoutType]?.header,
            footer: layouts[layoutType]?.footer,
            styles: styleSheets,
            outerClassName: [outerPageClassName, pageClassName]
              .filter(Boolean)
              .join(' '),
            innerClassName: innerPageClassName,
            outerDataAttributes: outerPageDataAttributes,
            innerDataAttributes: innerPageDataAttributes,
          });

          // TODO: Do this in PageTemplate constructor.
          renderEl.appendChild(template.element);

          stackTemplate[layoutType] = template;
        }

        const template = stackTemplate[layoutType];

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

        if (element.hasAttribute(DATA_STACK_INDEX)) {
          isFirst = true;
          stackIndex = Number.parseInt(
            element.getAttribute(DATA_STACK_INDEX)!,
            10,
          );
        } else {
          isFirst = false;
          stackIndex = Number.parseInt(
            element
              .closest(`[${DATA_STACK_INDEX}]`)!
              .getAttribute(DATA_STACK_INDEX)!,
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
              `[${DATA_STACK_INDEX}] > *`,
            ),
          }),
        );
      },
    });
  }

  const pagesEl = document.createElement('div');

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
