import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph as DocxParagraph,
  PageNumber,
  AlignmentType,
  HeadingLevel,
  type ParagraphChild,
  type IHeaderOptions,
  type IParagraphOptions,
  type ISectionOptions,
  type IRunOptions,
  type IStylesOptions,
  type IParagraphStyleOptions,
  type ICharacterStyleOptions,
  ExternalHyperlink,
} from 'docx';
import { startCase } from 'lodash-es';
import type {
  ContentParagraphOptions,
  ContentTextOptions,
  Color,
  VariantsConfig,
} from '../entities';
import { mapHtmlToDocument } from './mapHtmlToDocument.js';

const PARAGRAPH_OPTIONS_KEY: unique symbol = Symbol('OptionsKey');
class Paragraph extends DocxParagraph {
  public [PARAGRAPH_OPTIONS_KEY]: IParagraphOptions;

  public static clone(
    paragraph: Paragraph,
    extraOptions: Omit<Partial<IParagraphOptions>, 'children'> = {},
  ) {
    const newOptions = Object.assign(
      {},
      paragraph[PARAGRAPH_OPTIONS_KEY],
      extraOptions,
    );
    return new Paragraph(newOptions);
  }

  constructor(options: IParagraphOptions) {
    super(options);
    this[PARAGRAPH_OPTIONS_KEY] = options;
  }
}

const parseColor = (color?: Color) => color && color.replace('#', '');

const parseTextSize = (fontSize: ContentTextOptions['fontSize']) =>
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

const parseVariants = (variants: VariantsConfig): IStylesOptions => ({
  paragraphStyles: Object.entries(variants).map(
    ([variantName, variant]) =>
      ({
        id: variantName,
        name: startCase(variantName),
        quickFormat: true,
        paragraph: parseParagraphOptions(variant.paragraph),
      }) satisfies IParagraphStyleOptions,
  ),
  characterStyles: Object.entries(variants).map(
    ([variantName, variant]) =>
      ({
        id: variantName,
        name: startCase(variantName),
        quickFormat: true,
        basedOn: 'Normal',
        run: parseTextRunOptions(variant.text),
      }) satisfies ICharacterStyleOptions,
  ),
});

const parseParagraphOptions = ({
  textAlign,
  lineHeight,
}: ContentParagraphOptions = {}): IParagraphOptions => ({
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
}: ContentTextOptions = {}): IRunOptions => ({
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
    const elementsContext = node.data.elementsContext;
    const { text, paragraph } = elementsContext;

    if (node.type === 'text') {
      return new TextRun({
        ...parseTextRunOptions(text),
        style: elementsContext.variant,
        text: node.value,
      });
    }

    const {
      data: { element },
    } = node;

    if (node.type === 'element') {
      if (element.contentOptions.breakInside === 'avoid') {
        node.children = node.children.map((child, index) => {
          if (child instanceof Paragraph) {
            return Paragraph.clone(child, {
              keepLines: true,
              // If Paragraph is the last child, do not keep the next element.
              // If there is a parent breakInside it will overwrite this.
              keepNext: index !== node.children.length - 1,
            });
          }
          return child;
        });
      }

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

        // if (variant) { console.log(variant, element.elementType); }

        return new TextRun({
          ...parseTextRunOptions(text),
          style: elementsContext.variant,
          children,
        });
      }

      if (node.tagName === 'li') {
        return new Paragraph({
          ...parseParagraphOptions(paragraph),
          bullet: {
            level: elementsContext.list!.level!,
          },
          style: elementsContext.variant,
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'p') {
        return new Paragraph({
          ...parseParagraphOptions(paragraph),
          style: elementsContext.variant,
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName in DOCX_HEADING) {
        return new Paragraph({
          ...parseParagraphOptions(paragraph),
          style: elementsContext.variant,
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
      ...parseVariants(mappedDocument.variants),
    },
  });
};
