import type {
  LayoutType,
  DocumentElement,
  FontsConfig,
  StyleSheetsValue,
} from '../../entities';
import { Pager } from '../../utils/pager';
import { toCssStyleSheets } from '../../utils/css';
import { mapHtmlToDocument } from '../../lib/mapHtmlToDocument';
import { createFontFaceString, createStyleString } from '../../lib/styles';
import { PageTemplate } from './pageTemplate';
import { stacksToFragment } from './stacksToFragment';
import { nodeToDom } from './nodeToDom';
import { DATA_STACK_INDEX } from './constants';

export type DocumentDom = DocumentElement<HTMLElement>;

/**
 * True when nothing of `stackEl` is rendered before `node`, i.e. a page opened
 * at `node` opens the stack itself.
 */
const isStartOfStack = (stackEl: Element, node: Node): boolean => {
  let currentNode: null | Node = node;
  while (currentNode && currentNode !== stackEl) {
    for (
      let sibling = currentNode.previousSibling;
      sibling;
      sibling = sibling.previousSibling
    ) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE ||
        sibling.textContent?.trim()
      ) {
        return false;
      }
    }
    currentNode = currentNode.parentNode;
  }
  return currentNode === stackEl;
};

/**
 * `@font-face` is ignored inside a shadow root, so custom fonts are registered
 * on the document itself. The same configuration is reused across renders (a
 * live preview re-renders on every edit), so each stylesheet is adopted once.
 */
const adoptedFontFaceStyleSheets = new Map<string, CSSStyleSheet>();

const adoptFontFaces = async (css: string): Promise<void> => {
  if (!adoptedFontFaceStyleSheets.has(css)) {
    const styleSheet = new CSSStyleSheet();
    adoptedFontFaceStyleSheets.set(css, styleSheet);
    await styleSheet.replace(css);
    document.adoptedStyleSheets.push(styleSheet);
  }

  // Pagination measures text, so every registered face has to be fetched
  // before the first layout rather than after it.
  await Promise.all(
    Array.from(document.fonts, (fontFace) =>
      fontFace.load().catch((error: unknown) => {
        console.error(`Could not load the font ${fontFace.family}`, error);
      }),
    ),
  );
};

export type HtmlToDomOptions = {
  initialStyleSheets?: ReadonlyArray<StyleSheetsValue>;
  styleSheets?: ReadonlyArray<StyleSheetsValue>;
  pageClassName?: string;
  fonts?: FontsConfig;
  onDocument?: (document: DocumentDom) => void;
};

export const htmlToDom = async (
  html: string,
  {
    initialStyleSheets: initialStyleSheetsOption = [],
    styleSheets: styleSheetsOption = [],
    pageClassName,
    fonts,
    onDocument,
  }: HtmlToDomOptions = {},
): Promise<HTMLElement> => {
  const documentObj = mapHtmlToDocument<HTMLElement>(
    html,
    nodeToDom,
  ) satisfies DocumentDom;

  onDocument?.(documentObj);

  const {
    size,
    stacks: stacksOptions,
    prefixes,
    fonts: documentFonts,
  } = documentObj;

  const documentStyleCss = createStyleString(documentObj);

  // `reactToDom` and `reactToPdf` both render the `pdf` markup in a browser.
  // Fonts declared once on `DocumentProvider` reach every target through the
  // document element; a call-level config still overrides them.
  const fontFaceCss = createFontFaceString({
    fonts: fonts ?? documentFonts,
    documentType: 'pdf',
  });
  if (fontFaceCss) {
    await adoptFontFaces(fontFaceCss);
  }

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

  // A page belongs to the stack whose content starts it: that stack's header,
  // footer, margins and page size apply, and its `first` layout is used only
  // when the page also starts that stack's content. `continuous` stacks that
  // begin part way down a page therefore share the page of the stack above
  // them, which is the only attribution a single header/footer pair can have.
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

        const template = stackTemplate[layoutType]!;

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
            : breakElement.parentElement;

        const stackEl = element?.closest(`[${DATA_STACK_INDEX}]`);

        if (!stackEl) {
          // The break landed outside every stack (an element pagedjs moved out
          // of the source, for instance). Keep paging the current stack.
          return;
        }

        stackIndex = Number.parseInt(
          stackEl.getAttribute(DATA_STACK_INDEX)!,
          10,
        );

        // Resuming part way through a text run is never the start of a stack,
        // so only an element break token can open a `first` layout.
        isFirst =
          breakElement instanceof HTMLElement &&
          isStartOfStack(stackEl, breakElement);
      },
      onPageRendered: ({ pageIndex, contentElement }) => {
        const template = unextendedTemplates[pageIndex];

        if (!template) {
          throw new Error(
            `No page template was prepared for page ${pageIndex + 1}.`,
          );
        }

        // Note that contentElement is NOT cloned. It will be detached from
        // pager. A page can hold content from several continuous stacks; all
        // of it is kept, in document order, inside the template of the stack
        // that starts the page.
        extendedTemplates.push(
          template.extend({
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
