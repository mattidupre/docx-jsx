import type {
  LayoutType,
  DocumentElement,
  FontsConfig,
  FragmentationOption,
  StyleSheetsValue,
} from '../../entities';
import { Fragmenter } from '../../fragmenter/fragmenter';
import type { FragmentationProfile } from '../../fragmenter/profile';
import { resolveFragmentationProfile } from '../../fragmenter/profiles';
import { toCssStyleSheets } from '../../utils/css';
import { mapHtmlToDocument } from '../../lib/mapHtmlToDocument';
import { PAGE_CLASS_NAMES, PAGE_DATA_ATTRIBUTES } from '../../entities';
import { instantiateContentStyles } from '../../lib/contentStyles';
import { NEUTRAL_STYLES, PAGE_SHADOW_STYLES } from '../../generated/styles';
import {
  createFontFaceString,
  createVariantStyleString,
} from '../../lib/styles';
import { hashString } from '../../utils/string';
import { PageTemplate } from './pageTemplate';
import { toCssText, toScopedStyleSheet } from './scopedStyleSheets';
import { createDocumentStyles, type DocumentStyles } from './documentStyles';
import { createStackElements } from './createStackElements';
import { nodeToDom } from './nodeToDom';
import { DATA_STACK_INDEX } from './constants';

export type DocumentDom = DocumentElement<HTMLElement>;

export type HtmlToDomOptions = {
  initialStyleSheets?: ReadonlyArray<StyleSheetsValue>;
  styleSheets?: ReadonlyArray<StyleSheetsValue>;
  pageClassName?: string;
  fonts?: FontsConfig;
  /**
   * The conventions the pages are broken by. Overrides the document's own
   * `fragmentation` option; a full profile may carry hooks, which cannot
   * travel through the document's HTML.
   */
  fragmentation?: FragmentationOption | FragmentationProfile;
  onDocument?: (document: DocumentDom) => void;
  /**
   * Where the rendered pages' stylesheets are adopted, which is the document
   * the pages will be shown in. Defaults to a registry of its own on the
   * current document, kept for the life of the page; a preview passes one it
   * disposes when the pages go away.
   */
  documentStyles?: DocumentStyles;
};

export const htmlToDom = async (
  html: string,
  {
    initialStyleSheets: initialStyleSheetsOption = [],
    styleSheets: styleSheetsOption = [],
    pageClassName,
    fonts,
    fragmentation,
    onDocument,
    documentStyles = createDocumentStyles(document),
  }: HtmlToDomOptions = {},
): Promise<HTMLElement> => {
  // Pages are laid out and measured in the current document, then shown in
  // the one `documentStyles` belongs to. When those differ (a preview in an
  // iframe) the measuring document gets the same stylesheets for as long as
  // the render takes.
  const measureStyles =
    documentStyles.document === document
      ? documentStyles
      : createDocumentStyles(document);
  try {
    return await renderPages(html, {
      initialStyleSheetsOption,
      styleSheetsOption,
      pageClassName,
      fonts,
      fragmentation,
      onDocument,
      documentStyles,
      measureStyles,
    });
  } finally {
    if (measureStyles !== documentStyles) {
      measureStyles.dispose();
    }
  }
};

const renderPages = async (
  html: string,
  {
    initialStyleSheetsOption,
    styleSheetsOption,
    pageClassName,
    fonts,
    fragmentation,
    onDocument,
    documentStyles,
    measureStyles,
  }: {
    initialStyleSheetsOption: ReadonlyArray<StyleSheetsValue>;
    styleSheetsOption: ReadonlyArray<StyleSheetsValue>;
    pageClassName: undefined | string;
    fonts: undefined | FontsConfig;
    fragmentation: HtmlToDomOptions['fragmentation'];
    onDocument: HtmlToDomOptions['onDocument'];
    documentStyles: DocumentStyles;
    measureStyles: DocumentStyles;
  },
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
    fragmentation: documentFragmentation,
  } = documentObj;

  // The library's own rules (compiled at build time, instantiated for this
  // document's CSS variable prefix) and its variants (runtime data) come after
  // a consumer's initial stylesheets and before the rest, as before.
  const documentStyleCss = [
    instantiateContentStyles(documentObj),
    createVariantStyleString(documentObj),
  ];

  // `reactToDom` and `reactToPdf` both render the `pdf` markup in a browser.
  // Fonts declared once on `DocumentProvider` reach every target through the
  // document element; a call-level config still overrides them.
  const fontFaceCss = createFontFaceString({
    fonts: fonts ?? documentFonts,
    documentType: 'pdf',
  });
  if (fontFaceCss) {
    // `@font-face` is ignored inside a shadow root, so custom fonts are
    // registered on the documents themselves. The Fragmenter loads every face
    // before it measures.
    for (const styles of new Set([measureStyles, documentStyles])) {
      styles.adopt(fontFaceCss);
    }
  }

  const [
    neutralStyleSheets,
    initialStyleSheets,
    documentStyleSheets,
    finalStyleSheets,
  ] = await Promise.all(
    [
      [NEUTRAL_STYLES],
      initialStyleSheetsOption,
      documentStyleCss,
      styleSheetsOption,
    ].map((styles) => toCssStyleSheets(...styles)),
  );
  // The neutral rules undo what the host page leaks in by accident, so they
  // come first: a consumer's initial stylesheets may still reset content on
  // purpose, and the document's own rules come after those.
  const styleSheets = [
    ...neutralStyleSheets,
    ...initialStyleSheets,
    ...documentStyleSheets,
    ...finalStyleSheets,
  ];

  // On screen every page is a root in the one document, and a preview is
  // rarely the only one. Each render's whole cascade is scoped to its own
  // pages, named after the CSS it is made of, so no render's rules reach
  // another's pages: a later render cannot undo an override an earlier one
  // was paginated with. Two renders of identical CSS share a scope, and each
  // applies the same cascade in the same order, so neither changes the other.
  const renderStylesKey = hashString(
    styleSheets.map((styleSheet) => toCssText(styleSheet)).join('\n'),
  );
  const renderPageScope = `.${PageTemplate.rootClassName}${PAGE_DATA_ATTRIBUTES.selector(
    { documentStyles: renderStylesKey },
  )}`;
  // The page templates are measured in the current document before they are
  // shown in `documentStyles.document`, and a consumer rule on the page or
  // its parts changes the room there is to fill, so both documents get them.
  for (const styles of new Set([measureStyles, documentStyles])) {
    for (const styleSheet of styleSheets) {
      styles.adopt(styleSheet, renderPageScope);
    }
  }

  // The page chrome lives in each page element's shadow root, which the
  // stylesheets above cannot reach, and has one stylesheet of its own.
  const shadowStyleSheet = new CSSStyleSheet();
  shadowStyleSheet.replaceSync(PAGE_SHADOW_STYLES);

  // const perf = performance.now();

  // Create a temporary element in which to lay out the page templates. The
  // Fragmenter measures content in a shadow root of its own, and the page
  // chrome lives in each page element's.
  const renderEl = document.createElement('div');
  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  const stackTemplates: Array<Partial<Record<LayoutType, PageTemplate>>> = [];

  // Pagination measures the content under the same rules it is displayed
  // with: every stylesheet is scoped to the content root there exactly as it
  // is scoped to the page root on screen.
  const contentClassName = PAGE_CLASS_NAMES.name('contentRoot');
  const fragmenter = new Fragmenter({
    styles: styleSheets.map((styleSheet) =>
      toScopedStyleSheet(styleSheet, `.${contentClassName}`),
    ),
    contentClassName,
    // A call-level choice wins over the document's, as it does for fonts.
    profile: resolveFragmentationProfile(
      fragmentation ?? documentFragmentation,
    ),
  });

  // A page belongs to the stack whose content starts it: that stack's header,
  // footer, margins and page size apply, and its `first` layout is used only
  // when the page also starts that stack's content. `continuous` stacks that
  // begin part way down a page therefore share the page of the stack above
  // them, which is the only attribution a single header/footer pair can have.
  const extendedTemplates: Array<PageTemplate> = [];
  {
    const pageTemplates: Array<PageTemplate> = [];
    await fragmenter.toPages({
      stacks: createStackElements(stacksOptions, {}),
      onPageStart: ({ pageIndex, stackIndex, first }) => {
        const {
          margin,
          layouts,
          innerPageClassName,
          outerPageClassName,
          outerPageDataAttributes,
          innerPageDataAttributes,
        } = stacksOptions[stackIndex];

        const layoutType: LayoutType = first ? 'first' : 'subsequent';

        const stackTemplate = (stackTemplates[stackIndex] ??= {});

        let template = stackTemplate[layoutType];
        if (!template) {
          template = new PageTemplate({
            prefixes,
            size,
            margin,
            header: layouts[layoutType]?.header,
            footer: layouts[layoutType]?.footer,
            outerClassName: [outerPageClassName, pageClassName]
              .filter(Boolean)
              .join(' '),
            innerClassName: innerPageClassName,
            shadowStyleSheets: [shadowStyleSheet],
            outerDataAttributes: {
              ...outerPageDataAttributes,
              ...PAGE_DATA_ATTRIBUTES.encodeDataAttributes({
                documentStyles: renderStylesKey,
              }),
            },
            innerDataAttributes: innerPageDataAttributes,
          });

          // TODO: Do this in PageTemplate constructor.
          renderEl.appendChild(template.element);

          stackTemplate[layoutType] = template;
        }

        pageTemplates[pageIndex] = template;

        return template.contentSize;
      },
      onPageRendered: ({ pageIndex, contentElement }) => {
        const template = pageTemplates[pageIndex];

        if (!template) {
          throw new Error(
            `No page template was prepared for page ${pageIndex + 1}.`,
          );
        }

        // Note that contentElement is NOT cloned. A page can hold content
        // from several continuous stacks; all of it is kept, in document
        // order, inside the template of the stack that starts the page. Each
        // stack keeps its own element, as it had while it was measured:
        // unwrapping it changes which selectors match (`:first-child`, the
        // stack's class and data attributes), so the page would no longer be
        // the height the Fragmenter filled.
        extendedTemplates.push(
          template.extend({
            content: contentElement.querySelectorAll(`[${DATA_STACK_INDEX}]`),
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
