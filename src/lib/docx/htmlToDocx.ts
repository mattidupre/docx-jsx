import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph as DocxParagraph,
  PageNumber,
  type ParagraphChild,
  type IHeaderOptions,
  type IParagraphOptions,
  type ISectionOptions,
  ExternalHyperlink,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  type ITableBordersOptions,
  WidthType,
  SectionType,
} from 'docx';
import { assignDefined } from '../../utils/object';
import { mapHtmlToDocument } from '../mapHtmlToDocument';
import type { FontsConfig } from '../../entities';
import {
  parseTextRunOptions,
  parseParagraphOptions,
} from './typographyOptionsToDocx';
import {
  parseVariants,
  variantNameToCharacterStyleId,
  variantNameToParagraphStyleId,
} from './variantsToDocx';
import { toTwip } from './entities';

const DOCX_HEADING = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
} as const;

const TABLE_BORDERS_RESET: ITableBordersOptions = {
  top: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE },
};

const PARAGRAPH_OPTIONS_KEY: unique symbol = Symbol('OptionsKey');
/**
 * Override paragraph class so options can be changed after instantiation.
 */
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

export type HtmlToDocxOptions = { fonts: FontsConfig };

export const htmlToDocx = async (
  html: string,
  { fonts }: HtmlToDocxOptions,
) => {
  const mappedDocument = mapHtmlToDocument(html, (node) => {
    const elementsContext = node.data.elementsContext;
    const { contentOptions } = elementsContext;

    if (node.type === 'text') {
      return new TextRun({
        ...parseTextRunOptions(fonts, contentOptions),
        style: variantNameToCharacterStyleId(elementsContext.variant),
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

      // variantNameToParagraphStyleId
      // variantNameToCharacterStyleId

      if (element.elementType === 'pagenumber') {
        return new TextRun({
          ...parseTextRunOptions(fonts, contentOptions),
          style: variantNameToCharacterStyleId(elementsContext.variant),
          children: [PageNumber.CURRENT],
        });
      }

      if (element.elementType === 'pagecount') {
        return new TextRun({
          ...parseTextRunOptions(fonts, contentOptions),
          style: variantNameToCharacterStyleId(elementsContext.variant),
          children: [PageNumber.TOTAL_PAGES],
        });
      }

      if (element.elementType === 'split') {
        const [leftChild, rightChild] = node.children as Paragraph[];
        return new Table({
          borders: TABLE_BORDERS_RESET,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  margins: {
                    right: toTwip('0.0625rem'),
                  },
                  borders: TABLE_BORDERS_RESET,
                  children: [leftChild],
                }),
                new TableCell({
                  margins: {
                    left: toTwip('0.0625rem'),
                  },
                  borders: TABLE_BORDERS_RESET,
                  children: [rightChild],
                }),
              ],
            }),
          ],
        });
        // return new Paragraph({
        //   ...parseParagraphOptions(fonts, contentOptions),
        //   style: variantNameToParagraphStyleId(elementsContext.variant),
        //   children: [
        //     leftChild,
        //     new PositionalTab({
        //       alignment: PositionalTabAlignment.RIGHT,
        //       relativeTo: PositionalTabRelativeTo.MARGIN,
        //       leader: PositionalTabLeader.NONE,
        //     }),
        //     rightChild,
        //   ],
        // });
      }

      if (node.tagName === 'li') {
        return new Paragraph({
          ...parseParagraphOptions(fonts, contentOptions),
          bullet: {
            level: elementsContext.list!.level!,
          },
          style: variantNameToParagraphStyleId(elementsContext.variant),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'br') {
        return new TextRun({ break: 1 });
      }

      if (node.tagName === 'p') {
        return new Paragraph({
          ...parseParagraphOptions(fonts, contentOptions),
          style: variantNameToParagraphStyleId(elementsContext.variant),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName in DOCX_HEADING) {
        return new Paragraph({
          ...parseParagraphOptions(fonts, contentOptions),
          style: variantNameToParagraphStyleId(elementsContext.variant),
          heading: DOCX_HEADING[node.tagName as keyof typeof DOCX_HEADING],
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'a') {
        return new ExternalHyperlink({
          ...parseTextRunOptions(fonts, contentOptions),
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

  const sections = mappedDocument.stacks.map(
    ({ layouts, margin, content, continuous }, index) => {
      return {
        properties: {
          titlePage: true,
          type: index > 0 && continuous ? SectionType.CONTINUOUS : undefined,
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
    },
  );

  const styles = parseVariants(fonts, mappedDocument.variants);

  // const fontsWithBuffers = await fontsStore.loadFontsWithBuffers();
  // const docxFonts = [
  // {
  //   name: 'Sevillana',
  //   characterSet: CharacterSet.ANSI,
  //   data: fs.readFileSync(
  //     '/Users/mattidupre/Repositories/matti-docs/src/fixtures/mockAssets/Sevillana.ttf',
  //   ),
  // },
  // ...transform(
  //   fontsWithBuffers,
  //   (target, font) => {
  //     if (!font) {
  //       return;
  //     }
  //     target.push(
  //       ...font.fontFaces.map(({ fontFaceName, buffer }) => ({
  //         name: fontFaceName,
  //         data: buffer,
  //         characterSet: CharacterSet.ANSI,
  //       })),
  //     );
  //   },
  //   [] as Array<ArrayValues<NonNullable<IPropertiesOptions['fonts']>>>,
  // ),
  // ];

  return new Document({
    // fonts: docxFonts,
    evenAndOddHeaderAndFooters: false,
    sections,
    styles,
  });
};
