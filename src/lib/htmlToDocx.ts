import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  PageNumber,
  type IHeaderOptions,
  type IParagraphOptions,
  type ISectionOptions,
  type IRunOptions,
} from 'docx';
import { mapHtmlToDocument } from './mapHtmlToDocument.js';
import {
  type ParagraphOptions,
  type TextOptions,
} from 'src/entities/options.js';

const parseTextRunOptions = ({
  fontWeight,
  fontStyle,
}: TextOptions = {}): IRunOptions => ({
  bold: fontWeight === 'bold',
  italics: fontStyle === 'italic',
});

const parseParagraphOptions = (
  paragraphOptions: ParagraphOptions = {},
): IParagraphOptions => ({});

export const htmlToDocx = (html: string) => {
  const mappedDocument = mapHtmlToDocument(html, (node) => {
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
          children: node.children as IParagraphOptions['children'],
        });
      }
    }

    if (node.type === 'root') {
      if (element.elementType === 'header') {
        return new Header({
          children: node.children as IHeaderOptions['children'],
        });
      }

      if (element.elementType === 'content') {
        return node.children;
      }

      if (element.elementType === 'footer') {
        return new Footer({
          children: node.children as IHeaderOptions['children'],
        });
      }
    }

    return node.children;
  });

  const { size } = mappedDocument;

  const sections = mappedDocument.stacks.map(({ layouts, margin, content }) => {
    return {
      properties: {
        titlePage: true,
        page: {
          margin,
          size: size,
        },
      },
      headers: {
        first: layouts.first.header as Header,
        default: layouts.subsequent.header as Header,
      },
      footers: {
        first: layouts.first.footer as Footer,
        default: layouts.subsequent.footer as Footer,
      },
      children: content as ISectionOptions['children'],
    } satisfies ISectionOptions;
  });

  return new Document({
    evenAndOddHeaderAndFooters: false,
    sections,
  });
};
