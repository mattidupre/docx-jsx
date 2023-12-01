import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  SectionType,
  PageNumber,
  type ParagraphChild,
  type ISectionOptions,
} from 'docx';
import {
  CounterType,
  LAYOUT_TYPES,
  type LayoutType,
} from '../entities/primitives.js';

import {
  mapHtmlElements,
  type MapHtmlElementsContext,
  type DocumentElement,
} from '../entities/elements.js';

type PageType = (typeof PAGE_TYPE_BY_LAYOUT_TYPE)[LayoutType];

const PAGE_TYPE_BY_LAYOUT_TYPE = {
  first: 'first',
  left: 'default',
  right: 'even',
} as const satisfies Record<LayoutType, 'first' | 'default' | 'even'>;

const parseTextRunOptions = (context: MapHtmlElementsContext<any>) => ({});

export const htmlToDocx = (html: string) =>
  mapHtmlElements<any>(html, {
    onText: ({ value, context }) => {
      return new TextRun({
        ...parseTextRunOptions(context),
        children: [value],
      });
    },
    onElement: (element) => {
      const { tagName, elementType, context, children } = element;

      if (tagName === 'p') {
        // TODO: Apply context arguments.
        return new Paragraph({
          children: children as ParagraphChild[],
        });
      }

      if (elementType === 'counter') {
        const elementOptions = context.options.element as {
          counterType: CounterType;
        };
        if (elementOptions.counterType === 'page-number') {
          return new TextRun({
            ...parseTextRunOptions(context),
            children: [PageNumber.CURRENT],
          });
        }
        if (elementOptions.counterType === 'page-count') {
          return new TextRun({
            ...parseTextRunOptions(context),
            children: [PageNumber.TOTAL_PAGES],
          });
        }
      }

      if (elementType === 'header') {
        return new Header({ children });
      }

      if (elementType === 'footer') {
        return new Footer({ children });
      }

      if (elementType === 'stack') {
        const {
          layouts,
          counters: { stackCounter },
          options,
        } = context;

        const enableCoverPage = options.document!.pages!.enableCoverPage;

        const sectionType =
          stackCounter === 0
            ? enableCoverPage
              ? SectionType.EVEN_PAGE
              : SectionType.ODD_PAGE
            : SectionType.CONTINUOUS;

        const documentStartPageNumber = enableCoverPage ? 0 : 1;

        const stackStartPageNumber =
          stackCounter === 0 ? documentStartPageNumber : undefined;

        const headers: Partial<Record<PageType, Header>> = {};
        const footers: Partial<Record<PageType, Footer>> = {};

        for (const layoutType of LAYOUT_TYPES) {
          const { header, footer } = layouts?.[layoutType] || {};
          if (header) {
            headers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = header;
          }
          if (footer) {
            footers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = footer;
          }
        }

        return {
          properties: {
            titlePage: layouts?.first !== undefined,
            type: sectionType,
            page: {
              pageNumbers: {
                start: stackStartPageNumber,
              },
              margin: options.margin as Record<
                keyof typeof options.margin,
                string
              >,
              size: options.document!.size!,
            },
          },
          headers,
          children: children as any[],
          footers,
        } satisfies ISectionOptions;
      }

      if (elementType === 'document') {
        return new Document({
          evenAndOddHeaderAndFooters: true,
          sections: children as any[],
        });
      }

      return undefined;
    },
  });
