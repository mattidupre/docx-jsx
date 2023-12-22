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
import { pick, startCase } from 'lodash';
import type { Color, VariantsConfig, ContentOptions } from '../entities';
import { assignDefined } from '../utils/object';
import { mapHtmlToDocument } from './mapHtmlToDocument';

const PARAGRAPH_OPTIONS_KEY: unique symbol = Symbol('OptionsKey');
class Paragraph extends DocxParagraph {
  public [PARAGRAPH_OPTIONS_KEY]: IParagraphOptions;

  public static clone(
    paragraph: Paragraph,
    extraOptions: Omit<Partial<IParagraphOptions>, 'children'> = {},
  ) {
    const newOptions = assignDefined(
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

const parseTextSize = (fontSize: ContentOptions['fontSize']) =>
  fontSize !== undefined ? parseFloat(fontSize) * 22 : undefined;

const parseContentOptions = ({
  textAlign,
  lineHeight,
  fontSize,
  color,
  highlightColor,
  fontWeight,
  fontStyle,
  textTransform,
  textDecoration,
  superScript,
  subScript,
}: ContentOptions = {}): IParagraphOptions & IRunOptions => ({
  spacing: {
    line: lineHeight && parseFloat(lineHeight) * 240,
  },
  alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
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

const DOCX_TEXT_RUN_OPTIONS_KEYS = [
  'size',
  'color',
  'shading',
  'bold',
  'italics',
  'allCaps',
  'underline',
  'strike',
  'superScript',
  'subScript',
] as const satisfies ReadonlyArray<keyof IRunOptions>;

const parseTextRunOptions = (contentOptions: ContentOptions): IRunOptions =>
  pick(parseContentOptions(contentOptions), DOCX_TEXT_RUN_OPTIONS_KEYS);

const DOCX_PARAGRAPH_OPTIONS_KEYS = [
  'spacing',
  'alignment',
] as const satisfies ReadonlyArray<keyof IParagraphOptions>;

const parseParagraphOptions = (
  contentOptions: ContentOptions,
): IParagraphOptions =>
  pick(parseContentOptions(contentOptions), DOCX_PARAGRAPH_OPTIONS_KEYS);

const parseVariants = (variants: VariantsConfig): IStylesOptions => ({
  paragraphStyles: Object.entries(variants).map(
    ([variantName, variant]) =>
      ({
        id: variantName,
        name: startCase(variantName),
        quickFormat: true,
        paragraph: parseParagraphOptions(variant),
      }) satisfies IParagraphStyleOptions,
  ),
  characterStyles: Object.entries(variants).map(
    ([variantName, variant]) =>
      ({
        id: variantName,
        name: startCase(variantName),
        quickFormat: true,
        basedOn: 'Normal',
        run: parseTextRunOptions(variant),
      }) satisfies ICharacterStyleOptions,
  ),
});

export const htmlToDocx = (html: string) => {
  const mappedDocument = mapHtmlToDocument(html, (node) => {
    const elementsContext = node.data.elementsContext;
    const { contentOptions } = elementsContext;

    if (node.type === 'text') {
      return new TextRun({
        ...parseTextRunOptions(contentOptions),
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

      if (element.elementType === 'pagenumber') {
        return new TextRun({
          ...parseTextRunOptions(contentOptions),
          style: elementsContext.variant,
          children: [PageNumber.CURRENT],
        });
      }

      if (element.elementType === 'pagecount') {
        return new TextRun({
          ...parseTextRunOptions(contentOptions),
          style: elementsContext.variant,
          children: [PageNumber.TOTAL_PAGES],
        });
      }

      if (node.tagName === 'li') {
        return new Paragraph({
          ...parseParagraphOptions(contentOptions),
          bullet: {
            level: elementsContext.list!.level!,
          },
          style: elementsContext.variant,
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'p') {
        return new Paragraph({
          ...parseParagraphOptions(contentOptions),
          style: elementsContext.variant,
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName in DOCX_HEADING) {
        return new Paragraph({
          ...parseParagraphOptions(contentOptions),
          style: elementsContext.variant,
          heading: DOCX_HEADING[node.tagName as keyof typeof DOCX_HEADING],
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'a') {
        return new ExternalHyperlink({
          ...parseTextRunOptions(contentOptions),
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
