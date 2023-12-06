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
import { mapHtmlToDocument } from './mapHtmlToDocument.js';
import {
  type ParagraphOptions,
  type TextOptions,
} from 'src/entities/options.js';
import { mapValues } from 'lodash-es';
import { LayoutType } from 'src/entities/options.js';

// TODO
const parseTextRunOptions = (textOptions?: TextOptions) => ({});

// TODO
const parseParagraphOptions = (paragraphOptions?: ParagraphOptions) => ({});

export const htmlToDocx = (html: string) => {
  const mappedDocument = mapHtmlToDocument<any>(html, (node) => {
    const { textOptions, paragraphOptions } = node.data.optionsContext;

    if (node.type === 'text') {
      return new TextRun({
        ...parseTextRunOptions(textOptions),
        text: node.value,
      });
    }

    const {
      data: { element },
    } = node;

    if (node.type === 'element') {
      if (element.elementType === 'counter') {
        const { counterType } = element.elementOptions;
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

      if (node.tagName === 'p') {
        return new Paragraph({
          ...parseParagraphOptions(paragraphOptions),
          children: node.children,
        });
      }
    }

    if (node.type === 'root') {
      if (element.elementType === 'header') {
        return new Header({
          children: node.children,
        });
      }

      if (element.elementType === 'content') {
        return undefined;
      }

      if (element.elementType === 'footer') {
        return new Footer({
          children: node.children,
        });
      }
    }
  });

  const { size } = mappedDocument;

  const sections = mappedDocument.stacks.map(({ layouts, margin, content }) => {
    return {
      properties: {
        titlePage: true,
        page: {
          margin: margin,
          size: size,
        },
      },
      headers: {
        first: layouts.first.header,
        default: layouts.subsequent.header,
      },
      footers: {
        first: layouts.first.footer,
        default: layouts.subsequent.footer,
      },
      children: content,
    } satisfies ISectionOptions;
  });

  return new Document({
    evenAndOddHeaderAndFooters: false,
    sections,
  });
};
