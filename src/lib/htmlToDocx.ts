import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  PageNumber,
  AlignmentType,
  HeadingLevel,
  type ParagraphChild,
  type IHeaderOptions,
  type IParagraphOptions,
  type ISectionOptions,
  type IRunOptions,
  ExternalHyperlink,
} from 'docx';
import { mapHtmlToDocument } from './mapHtmlToDocument.js';
import {
  type ParagraphOptions,
  type TextOptions,
  type Color,
} from '../entities';

const parseColor = (color?: Color) => color && color.replace('#', '');

const parseTextSize = (fontSize: TextOptions['fontSize']) =>
  fontSize !== undefined ? parseFloat(fontSize) * 22 : undefined;

const DOCX_HEADING = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
} as const;

const DOCX_TEXT_ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const parseParagraphOptions = ({
  textAlign,
  lineHeight,
}: ParagraphOptions = {}): IParagraphOptions => ({
  spacing: {
    line: lineHeight && parseFloat(lineHeight) * 240,
  },
  alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
});

const parseTextRunOptions = ({
  fontSize,
  color,
  highlightColor,
  fontWeight,
  fontStyle,
  textTransform,
  textDecoration,
  superScript,
  subScript,
}: TextOptions = {}): IRunOptions => ({
  size: parseTextSize(fontSize),
  color: color && color.replace('#', ''),
  shading: highlightColor && {
    fill: parseColor(highlightColor),
  },
  bold: fontWeight === 'bold',
  italics: fontStyle === 'italic',
  allCaps: textTransform === 'uppercase',
  underline: textDecoration === 'underline' ? {} : undefined,
  strike: textDecoration === 'line-through' ? true : undefined,
  superScript,
  subScript,
});

export const htmlToDocx = (html: string) => {
  const mappedDocument = mapHtmlToDocument(html, (node) => {
    const { text, paragraph } = node.data.elementsContext;

    if (node.type === 'text') {
      return new TextRun({
        ...parseTextRunOptions(text),
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
          ...parseTextRunOptions(text),
          children,
        });
      }

      if (node.tagName === 'p') {
        return new Paragraph({
          ...parseParagraphOptions(paragraph),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName in DOCX_HEADING) {
        return new Paragraph({
          ...parseParagraphOptions(paragraph),
          heading: DOCX_HEADING[node.tagName as keyof typeof DOCX_HEADING],
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'a') {
        return new ExternalHyperlink({
          ...parseTextRunOptions(text),
          children: node.children as ParagraphChild[],
          link: node.properties.href,
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

    styles: {
      default: {
        document: { run: {}, paragraph: {} },
        title: { run: {}, paragraph: {} },
        heading1: { run: {}, paragraph: {} },
        heading2: { run: {}, paragraph: {} },
        heading3: { run: {}, paragraph: {} },
        heading4: { run: {}, paragraph: {} },
        heading5: { run: {}, paragraph: {} },
        heading6: { run: {}, paragraph: {} },
        strong: { run: {}, paragraph: {} },
        listParagraph: { run: {}, paragraph: {} },
        hyperlink: { run: {} },
        footnoteReference: { run: {} },
        footnoteText: { run: {} },
        footnoteTextChar: { run: {} },
      },
    },
  });
};
