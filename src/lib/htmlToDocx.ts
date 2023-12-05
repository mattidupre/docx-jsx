import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  PageNumber,
  type ISectionOptions,
  type IRunOptions,
} from 'docx';
import { mapDocument } from './mapDocumentHtml.js';
import {
  type ParagraphOptions,
  type TextOptions,
} from 'src/entities/options.js';
import { mapValues } from 'lodash-es';
import { LayoutType } from 'src/entities/options.js';

// TODO
const parseTextRunOptions = (textOptions: TextOptions) => ({});

// TODO
const parseParagraphOptions = (paragraphOptions: ParagraphOptions) => ({});

export const htmlToDocx = (html: string) => {
  const mappedDocument = mapDocument<any>(html, {
    onText: (context) => {
      return new TextRun({
        ...parseTextRunOptions(context.textOptions),
        text: context.textValue,
      });
    },
    onElement: (context) => {
      if (context.contextType === 'content') {
        if (context.elementType === 'counter') {
          const { counterType, ...textOptions } = context.elementOptions;
          const children: NonNullable<IRunOptions['children']>[number][] = [];
          if (counterType === 'page-number') {
            children.push(PageNumber.CURRENT);
          } else if (counterType === 'page-count') {
            children.push(PageNumber.TOTAL_PAGES);
          } else {
            throw new TypeError('Invalid counter type.');
          }
          return new TextRun({
            ...parseTextRunOptions(textOptions),
            children,
          });
        }

        if (context.tagName === 'p') {
          return new Paragraph({
            ...parseParagraphOptions(context.paragraphOptions),
            children: context.children,
          });
        }

        if (context.elementType === 'header') {
          return new Header({
            children: context.children,
          });
        }

        if (context.elementType === 'footer') {
          return new Footer({
            children: context.children,
          });
        }
      }

      if (context.contextType === 'stack') {
        if (context.elementType === 'stack') {
          const {
            documentOptions: { size },
            stackOptions: { layouts, margin },
          } = context;

          return {
            properties: {
              titlePage:
                layouts?.first !== false &&
                !(
                  layouts?.first?.header === undefined &&
                  layouts?.first?.footer === undefined
                ),
              page: {
                margin: margin,
                size: size,
              },
            },
            headers: mapValues(
              layouts,
              (layout) => layout && layout.header,
            ) as Record<LayoutType, Header>,
            footers: mapValues(
              layouts,
              (layout) => layout && layout.footer,
            ) as Record<LayoutType, Header>,
            children: context.children,
          } satisfies ISectionOptions;
        }
      }

      if (context.contextType === 'document') {
        return new Document({
          evenAndOddHeaderAndFooters: false,
          sections: context.children,
        });
      }
    },
  });

  return mappedDocument;
};
