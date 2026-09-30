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
  type IParagraphPropertiesOptions,
  type ISectionOptions,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  type ITableBordersOptions,
  WidthType,
  SectionType,
  PageBreak,
  ColumnBreak,
  AlignmentType,
  LineRuleType,
  Bookmark,
  InternalHyperlink,
  Tab,
  TabStopType,
  type TabStopDefinition,
} from 'docx';
import { range } from 'lodash';
import { assignDefined } from '../../utils/object';
import { isValueInArray } from '../../utils/array';
import {
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS,
  MONOSPACE_DOCX_FONT_NAME,
  isChildOfTagName,
} from '../../entities';
import {
  type HtmlElementNode,
  mapHtmlToDocument,
} from '../../lib/mapHtmlToDocument';
import type {
  ElementData,
  ElementsContext,
  ElementType,
  FontsConfig,
  PageMargin,
  PageSize,
  TagName,
  UnitsSize,
  INTRINSIC_VARIANT_TAG_NAMES,
} from '../../entities';
import {
  parseTextRunOptions,
  parseParagraphOptions,
} from './typographyOptionsToDocx';
import {
  parseVariants,
  variantNameToCharacterStyleId,
  variantNameToParagraphStyleId,
} from './variantsToDocx';
import { toPt, toPx, toTwip } from './entities';
import { toDocxColor } from './toDocxColor';
import { MAX_LIST_LEVEL, createListNumbering } from './numberingToDocx';
import { type DocumentImage, resolveDocumentImages } from './documentImages';
import { tableToDocx } from './tableToDocx';

const DOCX_HEADING = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
} as const;

/**
 * Tags whose children are blocks in CSS. Word has no inline content outside a
 * paragraph, so runs collected inside one of these are gathered into a
 * paragraph of their own instead of escaping to the section.
 */
const BLOCK_TAG_NAMES = [
  'div',
  'ul',
  'ol',
] as const satisfies ReadonlyArray<TagName>;

/**
 * Elements whose children are read structurally -- one entry per grid item, one
 * entry per split side -- and so must reach their branch exactly as mapped.
 */
const STRUCTURAL_CHILDREN_ELEMENT_TYPES = [
  'gridContainer',
  'split',
] as const satisfies ReadonlyArray<ElementType>;

/**
 * The variant CSS applies to every `<a>`; Word styles a hyperlink the same way,
 * through a character style on the runs inside it.
 */
const HYPERLINK_VARIANT_NAME =
  'hyperlink' satisfies keyof typeof INTRINSIC_VARIANT_TAG_NAMES;

/**
 * `Split` renders its two sides with this gap between them; the DOCX table
 * splits it over the two cells.
 */
const SPLIT_COLUMN_GAP: UnitsSize = '0.0625rem';

/**
 * An `href` that begins with this points at a `Bookmark` in this document
 * rather than at a URL, which is the one distinction Word draws between its two
 * kinds of hyperlink.
 */
const INTERNAL_HREF_PREFIX = '#';

const NO_BREAK_SPACE = '\u00a0';

const WHITESPACE_EXP = /\s/g;

/**
 * The tags CSS sets in a monospaced font. Word resolves no generic family, so
 * their runs name the fixed pitch font every Word installation ships.
 */
const MONOSPACE_TAG_NAMES = [
  'pre',
  'code',
] as const satisfies ReadonlyArray<TagName>;

/**
 * `white-space: pre` keeps the newlines of the source, and Word ends a line
 * inside a paragraph with a break rather than with a character.
 */
const NEW_LINE_EXP = /\r\n|\r|\n/;

/**
 * The intrinsic margins of a `pre` and the margins and inset of a
 * `blockquote`, in the twips Word reads, from the one table `lib/styles.ts`
 * builds their CSS rules from. No font configuration is needed: a paragraph
 * property is a length, never a face.
 */
const PRE_PARAGRAPH_OPTIONS = parseParagraphOptions(
  {},
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS.pre,
);

const BLOCKQUOTE_PARAGRAPH_OPTIONS = parseParagraphOptions(
  {},
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS.blockquote,
);

const TABLE_BORDERS_RESET: ITableBordersOptions = {
  top: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE },
};

/**
 * Every OOXML measurement written here is `ST_TwipsMeasure`, which Word reads as
 * a whole number of twips. A CSS length handed to `docx` verbatim ends up in the
 * file as `w:w="8.5in"`, which Word and every converter measure differently (or
 * not at all).
 */
const toWholeTwip = (value: UnitsSize): number => Math.round(toTwip(value));

const DOCX_ALIGNMENT = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
} as const;

/**
 * ECMA-376 CT_Border writes `w:sz` in eighths of a point, capped at 12pt. A rule
 * the document asked for is never rounded away to nothing, so the floor is one
 * eighth rather than zero, which is how a border is switched off.
 */
const BORDER_WIDTH_EIGHTHS_PER_PT = 8;
const BORDER_WIDTH_EIGHTHS_MAX = 96;

const toBorderWidthEighths = (value: UnitsSize): number =>
  Math.min(
    Math.max(Math.round(toPt(value) * BORDER_WIDTH_EIGHTHS_PER_PT), 1),
    BORDER_WIDTH_EIGHTHS_MAX,
  );

/**
 * `w:line` is a whole number of twips under `lineRule="exact"`, and a paragraph
 * with no height at all is not a paragraph, so an empty block always measures at
 * least one twip.
 */
const toExactLineTwip = (value: UnitsSize): number =>
  Math.max(toWholeTwip(value), 1);

const DIVIDER_FULL_WIDTH_PERCENT = 100;

/**
 * The size to draw a picture at, in the CSS pixels `docx` measures a
 * transformation in. Only one of `width`/`height` has to be given: the other is
 * derived from the aspect ratio in the file's own header, which is what the
 * browser does with the `auto` axis.
 */
const toImageTransformation = (
  src: string,
  { intrinsicWidth, intrinsicHeight }: DocumentImage,
  { width, height }: { width?: UnitsSize; height?: UnitsSize },
) => {
  const widthPx = width === undefined ? undefined : toPx(width);
  const heightPx = height === undefined ? undefined : toPx(height);

  if (widthPx !== undefined && heightPx !== undefined) {
    return { width: Math.round(widthPx), height: Math.round(heightPx) };
  }

  if (widthPx === undefined && heightPx === undefined) {
    throw new TypeError(
      `The image "${src}" must be given a width, a height, or both.`,
    );
  }

  if (!intrinsicWidth || !intrinsicHeight) {
    throw new TypeError(
      `The intrinsic size of the image "${src}" could not be read from its header, so it must be given both a width and a height.`,
    );
  }

  const aspectRatio = intrinsicWidth / intrinsicHeight;

  if (widthPx !== undefined) {
    return {
      width: Math.round(widthPx),
      height: Math.round(widthPx / aspectRatio),
    };
  }

  return {
    width: Math.round((heightPx ?? 0) * aspectRatio),
    height: Math.round(heightPx ?? 0),
  };
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

/**
 * A `w:tab` run together with the tab stop the paragraph holding it has to
 * declare. A tab with no stop to travel to advances by Word's default half
 * inch, so the two only mean "push the rest of the line to the right margin"
 * when they are written together.
 */
class TabRun extends TextRun {
  public readonly tabStop: TabStopDefinition;

  constructor(tabStop: TabStopDefinition) {
    super({ children: [new Tab()] });
    this.tabStop = tabStop;
  }
}

const toTabStops = (
  children: ReadonlyArray<unknown>,
): undefined | ReadonlyArray<TabStopDefinition> => {
  const tabStops = children
    .filter((child): child is TabRun => child instanceof TabRun)
    .map((child) => child.tabStop);
  return tabStops.length > 0 ? tabStops : undefined;
};

const BOOKMARK_NAME_ESCAPE = 'U';

const BOOKMARK_NAME_ESCAPED_EXP = new RegExp(
  `[^0-9A-Za-z_]|${BOOKMARK_NAME_ESCAPE}`,
  'g',
);

const BOOKMARK_NAME_MAX_LENGTH = 40;

/**
 * ECMA-376 bookmark names are single tokens: they begin with a letter or an
 * underscore, hold only letters, digits and underscores, and Word keeps at most
 * 40 characters of one. Every other character is escaped as `U` plus its four
 * hex digit code unit -- and a literal `U` as `UU` -- the same reversible
 * scheme the variant style ids use, so two ids can never collide and an id
 * never shifts when another one is added.
 *
 * @example
 * toBookmarkName('cetology'); // 'cetology'
 * toBookmarkName('chapter one'); // 'chapterU0020one'
 * toBookmarkName('1841'); // '_1841'
 */
const toBookmarkName = (id: string): string => {
  const escaped = id.replace(BOOKMARK_NAME_ESCAPED_EXP, (character) =>
    character === BOOKMARK_NAME_ESCAPE
      ? `${BOOKMARK_NAME_ESCAPE}${BOOKMARK_NAME_ESCAPE}`
      : `${BOOKMARK_NAME_ESCAPE}${character
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')}`,
  );
  // A name that starts with a digit is not a valid token, so it is prefixed
  // rather than escaped, which would push the readable part out of the 40
  // characters Word keeps.
  const named = /^[0-9]/.test(escaped) ? `_${escaped}` : escaped;
  return named.slice(0, BOOKMARK_NAME_MAX_LENGTH);
};

type BlockChild = DocxParagraph | Table;

const isBlockChild = (value: unknown): value is BlockChild =>
  value instanceof DocxParagraph || value instanceof Table;

const keepParagraphLines = (child: BlockChild): BlockChild =>
  child instanceof Paragraph
    ? Paragraph.clone(child, { keepLines: true })
    : child;

/**
 * A section, a table cell and a header all hold blocks, never runs. Runs that
 * end up between blocks -- text in a `Split` side, an `ImageRun` standing in for
 * an `Svg`, the contents of a `Raw` element -- are gathered into a paragraph of
 * their own rather than written at section level, where Word reads them as a
 * corrupt document.
 */
const toBlockChildren = (
  children: ReadonlyArray<unknown>,
  paragraphOptions?: IParagraphPropertiesOptions,
): Array<BlockChild> => {
  const blocks: Array<BlockChild> = [];
  let runs: Array<ParagraphChild> = [];
  const flushRuns = () => {
    if (runs.length > 0) {
      blocks.push(new Paragraph({ ...paragraphOptions, children: runs }));
      runs = [];
    }
  };
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null) {
      continue;
    }
    if (isBlockChild(child)) {
      flushRuns();
      blocks.push(child);
      continue;
    }
    runs.push(child as ParagraphChild);
  }
  flushRuns();
  return blocks;
};

/**
 * A `w:tc` without a block-level child makes the document unreadable, so an
 * empty cell still gets an empty paragraph.
 */
const toCellChildren = (
  children: ReadonlyArray<unknown>,
  {
    paragraphOptions,
    keepLines,
  }: {
    paragraphOptions?: IParagraphPropertiesOptions;
    keepLines: boolean;
  },
): Array<BlockChild> => {
  const blocks = toBlockChildren(children, paragraphOptions).map((child) =>
    keepLines ? keepParagraphLines(child) : child,
  );
  return blocks.length > 0 ? blocks : [new Paragraph({ children: [] })];
};

const toPageProperties = (size: PageSize, margin: PageMargin) => ({
  size: {
    width: toWholeTwip(size.width),
    height: toWholeTwip(size.height),
  },
  margin: {
    top: toWholeTwip(margin.top),
    right: toWholeTwip(margin.right),
    bottom: toWholeTwip(margin.bottom),
    left: toWholeTwip(margin.left),
    header: toWholeTwip(margin.header),
    footer: toWholeTwip(margin.footer),
  },
});

/**
 * The width of one line of text, in twips: the page less its side margins, and
 * in a multi column section one column of that. Word measures a tab stop from
 * the start of the text, so this is where a right aligned tab stop goes to put
 * its run flush against the right edge of the text.
 */
const toContentWidthTwip = ({
  document: { size },
  stack: { margin, columns },
}: ElementsContext): number => {
  const textWidth =
    toWholeTwip(size.width) -
    toWholeTwip(margin.left) -
    toWholeTwip(margin.right);
  const { columnCount, columnGap } = columns;
  if (columnCount <= 1) {
    return textWidth;
  }
  return Math.round(
    (textWidth - toWholeTwip(columnGap) * (columnCount - 1)) / columnCount,
  );
};

/**
 * A rasterized stand-in for one `Svg`, keyed by the `id` of the `<svg>` element.
 * Word cannot draw an SVG that was written as markup, so the only way to keep
 * the graphic is to hand the DOCX target a bitmap of it.
 */
export type SvgImage = {
  /** The bytes of a PNG rendering of the SVG. */
  data: Uint8Array | string;
  /** Rendered size in pixels, matching the `width`/`height` of the `<svg>`. */
  width: number;
  height: number;
};

export type HtmlToDocxOptions = {
  /**
   * Optional: a document that declares its fonts on `DocumentProvider` carries
   * them on its document element, and this overrides those when given.
   */
  fonts?: FontsConfig;
  svgImages?: Readonly<Record<string, SvgImage>>;
  /**
   * The directory an `Image` whose `src` is not a `data:` URL is read from, the
   * same way the PDF target serves it to Chrome. Word embeds the bytes rather
   * than referring to the file, so they are read here with `node:fs/promises`
   * before the document is mapped.
   */
  publicDirectory?: string;
};

export const htmlToDocx = async (
  html: string,
  { fonts: fontsOption, svgImages, publicDirectory }: HtmlToDocxOptions,
) => {
  // Mapping is synchronous and reading an image is not, so every `Image` source
  // in the document is resolved to bytes before the mapping starts.
  const images = await resolveDocumentImages(html, { publicDirectory });

  // Every list declares the numbering it needs while it is mapped, so the
  // document ships exactly the definitions its paragraphs point at.
  const listNumbering = createListNumbering();

  const mappedDocument = mapHtmlToDocument(html, (node) => {
    const elementsContext = node.data.elementsContext;
    // Fonts declared once on `DocumentProvider` ride along on the document
    // element, so every target resolves the same families.
    const fonts = fontsOption ?? elementsContext.document?.fonts ?? {};
    const { contentOptions } = elementsContext;

    if (node.type === 'text') {
      const { whiteSpace } = contentOptions;
      const { value } = node;
      const { parentTagNames } = node.data;
      const runOptions = {
        // A `code` or `pre` names its font on the run, because Word has no
        // stylesheet to read the tag from. It is spread first so an author who
        // asked for a family of their own still wins.
        ...(isChildOfTagName(parentTagNames, MONOSPACE_TAG_NAMES) && {
          font: MONOSPACE_DOCX_FONT_NAME,
        }),
        ...parseTextRunOptions(fonts, contentOptions),
        style: variantNameToCharacterStyleId(
          elementsContext.variant ??
            (elementsContext.isInsideHyperlink
              ? HYPERLINK_VARIANT_NAME
              : undefined),
        ),
      };

      // Word has no run-level "do not wrap": non-breaking spaces are what
      // keeps a phrase on one line, and unlike a `w:sym` word joiner they
      // exist in every font.
      const toPreservedText = (text: string) =>
        text.replace(WHITESPACE_EXP, NO_BREAK_SPACE);

      if (whiteSpace === 'pre' || isChildOfTagName(parentTagNames, 'pre')) {
        // Preformatted text keeps its spaces and its line breaks. A `w:br` is
        // how Word ends a line inside a paragraph, so every newline becomes one
        // and the runs between them are flattened into the paragraph.
        return value
          .split(NEW_LINE_EXP)
          .flatMap((line, index) => [
            ...(index > 0 ? [new TextRun({ break: 1 })] : []),
            new TextRun({ ...runOptions, text: toPreservedText(line) }),
          ]);
      }

      return new TextRun({
        ...runOptions,
        text: whiteSpace === 'nowrap' ? toPreservedText(value) : value,
      });
    }

    const {
      data: { element },
    } = node;

    if (node.type === 'element') {
      const {
        contentOptions: { breakInside, breakAfter },
      } = element;

      const paragraphOptions = parseParagraphOptions(fonts, contentOptions);

      // The element that carries the break rule may itself be the paragraph,
      // as in `<Typography as="h2" breakAfter="avoid">`. The loop below only
      // reaches the paragraphs a wrapper holds.
      const ownKeepOptions = {
        ...(breakInside === 'avoid' && { keepLines: true }),
        ...(breakAfter === 'avoid' && { keepNext: true }),
      };

      // `breakInside` accumulates down the context, so a table built inside a
      // `BreakAvoid` knows to keep its own rows and paragraphs together.
      const keepChildrenTogether = contentOptions.breakInside === 'avoid';

      if (
        !elementsContext.isInsideParagraph &&
        isValueInArray(node.tagName, BLOCK_TAG_NAMES) &&
        !isValueInArray(element.elementType, STRUCTURAL_CHILDREN_ELEMENT_TYPES)
      ) {
        node.children = toBlockChildren(node.children, paragraphOptions);
      }

      if (breakInside === 'avoid' || breakAfter === 'avoid') {
        node.children = node.children.map((child, index) => {
          if (child instanceof Paragraph) {
            return Paragraph.clone(child, {
              keepLines: breakInside === 'avoid',
              // If Paragraph is the last child, do not keep the next element.
              // If there is a parent breakInside it will overwrite this.
              keepNext:
                index < node.children.length - 1 ||
                breakAfter === 'avoid' ||
                child[PARAGRAPH_OPTIONS_KEY].keepNext === true,
            });
          }
          // A Table keeps itself together through `cantSplit` on its rows.
          return child;
        });
      }

      if (element.elementType === 'positionalTab') {
        const {
          elementOptions: { alignment },
        } = element;
        // A `w:ptab` is the exact construct this needs, and Word draws it, but
        // docx-preview and most other readers ignore it and run the two sides
        // together. An ordinary tab stop at the text width is understood
        // everywhere and lands in the same place.
        const contentWidth = toContentWidthTwip(elementsContext);
        return new TabRun(
          alignment === 'center'
            ? {
                type: TabStopType.CENTER,
                position: Math.round(contentWidth / 2),
              }
            : alignment === 'left'
              ? { type: TabStopType.LEFT, position: 0 }
              : { type: TabStopType.RIGHT, position: contentWidth },
        );
      }

      if (element.elementType === 'image') {
        const {
          elementOptions: { src, width, height, alt, align },
        } = element;
        const image = images.get(src);
        if (!image) {
          throw new Error(`No image data was resolved for "${src}".`);
        }
        const imageRun = new ImageRun({
          type: image.type,
          data: image.data,
          // Word reads the alt text off the drawing's document properties, which
          // is where a screen reader and "Edit Alt Text" both look.
          altText: { name: alt, title: alt, description: alt },
          transformation: toImageTransformation(src, image, { width, height }),
        });
        // Inside a paragraph the picture is one run among the text, exactly as
        // an inline `<img>` is, and the paragraph it sits in owns the alignment.
        return elementsContext.isInsideParagraph
          ? imageRun
          : new Paragraph({
              ...paragraphOptions,
              ...(align && { alignment: DOCX_ALIGNMENT[align] }),
              children: [imageRun],
            });
      }

      if (element.elementType === 'divider') {
        const {
          elementOptions: { color, thickness, spaceBefore, spaceAfter, width },
        } = element;
        const {
          document: {
            size: { width: pageWidth },
          },
          stack: {
            margin: { left, right },
          },
        } = elementsContext;
        const contentWidthTwip =
          toWholeTwip(pageWidth) - toWholeTwip(left) - toWholeTwip(right);

        return new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: toBorderWidthEighths(thickness),
              color: toDocxColor(color),
            },
          },
          spacing: {
            before: toWholeTwip(spaceBefore),
            after: toWholeTwip(spaceAfter),
            // An empty paragraph is a full line of body text in Word and a block
            // of zero content height in CSS. Pinning the line to the thickness
            // of the rule makes the two occupy the same height.
            line: toExactLineTwip(thickness),
            lineRule: LineRuleType.EXACT,
          },
          // A paragraph border always runs the full width between the indents,
          // so a narrower rule is an indent rather than a width.
          ...(width !== undefined &&
            width < DIVIDER_FULL_WIDTH_PERCENT && {
              indent: {
                right: Math.round(
                  (contentWidthTwip * (DIVIDER_FULL_WIDTH_PERCENT - width)) /
                    DIVIDER_FULL_WIDTH_PERCENT,
                ),
              },
            }),
          children: [],
        });
      }

      if (element.elementType === 'spacer') {
        const {
          elementOptions: { height },
        } = element;
        return new Paragraph({
          spacing: {
            before: 0,
            after: 0,
            // Exact line spacing is the only paragraph height Word does not
            // adjust for the font, so the gap measures the same twips as the
            // CSS height.
            line: toExactLineTwip(height),
            lineRule: LineRuleType.EXACT,
          },
          children: [],
        });
      }

      if (element.elementType === 'gridContainer') {
        const {
          document: {
            size: { width },
          },
          stack: {
            margin: { left, right },
          },
        } = elementsContext;
        const {
          elementOptions: { columnGap, columnCount },
        } = element;
        const gapTwip = toWholeTwip(columnGap);
        const gridIndent = Math.round(gapTwip * (-1 / 2));
        const gridWidthTwip =
          toWholeTwip(width) -
          toWholeTwip(left) -
          toWholeTwip(right) -
          gridIndent * 2;
        const toColumnsWidth = (span: number) =>
          Math.round((gridWidthTwip * span) / columnCount);
        const columnWidths = range(columnCount).map(() => toColumnsWidth(1));

        const rows: Array<TableRow> = [];
        let currentRowCells: Array<TableCell> = [];
        let positionLeft = 0;
        const createTableCell = ({
          start,
          end,
          children,
        }: {
          start: number;
          end: number;
          children: ReadonlyArray<unknown>;
        }) => {
          if (!(start >= 0) || !(end <= columnCount)) {
            throw new TypeError(`Invalid cell range ${start} to ${end} `);
          }
          const size = end - start;
          return new TableCell({
            margins: {
              left: Math.round(gapTwip / 2),
              right: Math.round(gapTwip / 2),
            },
            borders: TABLE_BORDERS_RESET,
            children: toCellChildren(children, {
              keepLines: keepChildrenTogether,
            }),
            width: {
              type: WidthType.DXA,
              size: toColumnsWidth(size),
            },
            columnSpan: size,
          });
        };
        const finalizeRow = () => {
          if (positionLeft < columnCount) {
            currentRowCells.push(
              createTableCell({
                children: [],
                start: positionLeft,
                end: columnCount,
              }),
            );
          }
          positionLeft = 0;
          rows.push(
            new TableRow({
              // A grid row breaks across pages exactly like the floats it
              // stands in for, unless the grid was told not to.
              ...(keepChildrenTogether && { cantSplit: true }),
              children: [...currentRowCells],
            }),
          );
          currentRowCells.splice(0, Infinity);
        };

        for (let i = 0; i < node.children.length; i += 1) {
          const {
            data: { element },
            children,
          } = node.children[i] as HtmlElementNode;
          const {
            elementOptions: { size },
          } = element as ElementData<'gridItem'>;
          // Matches `clampItemSize` in `Grid.tsx`: an item wider than the grid
          // gets a row of its own rather than a cell range no table can hold.
          const span = Math.min(Math.max(Math.round(size), 1), columnCount);

          if (positionLeft + span > columnCount) {
            // Item overflows, wrap it to a new row.
            finalizeRow();
          }

          currentRowCells.push(
            createTableCell({
              start: positionLeft,
              end: positionLeft + span,
              children,
            }),
          );

          positionLeft += span;

          if (i === node.children.length - 1) {
            // Close out the last row.
            finalizeRow();
          }
        }

        if (rows.length === 0) {
          // A `w:tbl` without a row makes the document unreadable.
          return [];
        }

        return new Table({
          borders: TABLE_BORDERS_RESET,
          indent: {
            size: gridIndent,
            type: WidthType.DXA,
          },
          columnWidths,
          rows,
          width: { size: gridWidthTwip, type: WidthType.DXA },
        });
      }

      if (element.elementType === 'gridItem') {
        // Handled by gridContainer
        return node;
      }

      if (element.elementType === 'table') {
        return tableToDocx(node, element.elementOptions, {
          fonts,
          contentWidthTwip: toContentWidthTwip(elementsContext),
          keepChildrenTogether,
          toCellChildren,
        });
      }

      if (
        element.elementType === 'tableRow' ||
        element.elementType === 'tableCell'
      ) {
        // Handled by table, which reads the rows and cells structurally.
        return node;
      }

      if (element.elementType === 'break') {
        const docxBreak = elementsContext.isInsideColumn
          ? new ColumnBreak()
          : new PageBreak();
        return elementsContext.isInsideParagraph
          ? docxBreak
          : new Paragraph({ children: [docxBreak] });
      }

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
        // One entry per side, each holding however many blocks that side
        // rendered.
        const [leftChild, rightChild] = node.children;
        const cellGapTwip = toWholeTwip(SPLIT_COLUMN_GAP);
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
                    right: cellGapTwip,
                  },
                  borders: TABLE_BORDERS_RESET,
                  children: toCellChildren([leftChild], {
                    paragraphOptions,
                    keepLines: keepChildrenTogether,
                  }),
                }),
                new TableCell({
                  margins: {
                    left: cellGapTwip,
                  },
                  borders: TABLE_BORDERS_RESET,
                  children: toCellChildren([rightChild], {
                    paragraphOptions,
                    keepLines: keepChildrenTogether,
                  }),
                }),
              ],
            }),
          ],
        });
      }

      if (node.tagName === 'svg') {
        const svgId = node.properties.id;
        const svgImage = svgId ? svgImages?.[svgId] : undefined;
        if (!svgImage) {
          // Never silently: an SVG that reaches Word as markup is not a
          // picture, and its labels are not paragraphs.
          console.warn(
            `Inline SVG ${
              svgId ? `"#${svgId}"` : '<svg>'
            } cannot be rendered in DOCX. Pass a rasterized image for it through the "svgImages" option.`,
          );
          return [];
        }
        return new ImageRun({
          type: 'png',
          data: svgImage.data,
          transformation: {
            width: svgImage.width,
            height: svgImage.height,
          },
        });
      }

      if (node.tagName === 'li') {
        const { list } = elementsContext;
        return new Paragraph({
          ...paragraphOptions,
          ...ownKeepOptions,
          // The declared numbering, rather than `bullet`: `bullet` always
          // writes Word's own `ListParagraph` style, and `w:pPr` holds at most
          // one `w:pStyle`, so an item could never keep its variant's style.
          numbering: {
            reference: listNumbering.useList(list),
            level: Math.min(Math.max(list.level, 0), MAX_LIST_LEVEL),
            instance: Math.max(list.instance, 0),
          },
          style: variantNameToParagraphStyleId(elementsContext.variant),
          tabStops: toTabStops(node.children),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'br') {
        return new TextRun({ break: 1 });
      }

      if (node.tagName === 'p') {
        return new Paragraph({
          ...paragraphOptions,
          ...ownKeepOptions,
          style: variantNameToParagraphStyleId(elementsContext.variant),
          tabStops: toTabStops(node.children),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'pre') {
        return new Paragraph({
          // A `pre` is one paragraph holding the line breaks its text carried,
          // so the intrinsic margins are its own. An author's options are
          // assigned after them and still win.
          ...PRE_PARAGRAPH_OPTIONS,
          ...paragraphOptions,
          ...ownKeepOptions,
          style: variantNameToParagraphStyleId(elementsContext.variant),
          tabStops: toTabStops(node.children),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'blockquote') {
        const quoteIndent = BLOCKQUOTE_PARAGRAPH_OPTIONS?.indent;
        const quoteSpacing = BLOCKQUOTE_PARAGRAPH_OPTIONS?.spacing;
        const blocks = toBlockChildren(node.children, paragraphOptions);
        return blocks.map((child, index) => {
          // A `w:tbl` inside a quote carries its own indent and is left alone.
          if (!(child instanceof Paragraph)) {
            return child;
          }
          const { indent, spacing } = child[PARAGRAPH_OPTIONS_KEY];
          return Paragraph.clone(child, {
            // Word indents paragraphs rather than the box around them, so the
            // quote's inset is applied to every block it holds.
            indent: { ...indent, ...quoteIndent },
            // CSS gives the quote one margin box, not one per paragraph inside
            // it, so its vertical margins go on the outermost blocks only.
            spacing: {
              ...spacing,
              ...(index === 0 ? { before: quoteSpacing?.before } : {}),
              ...(index === blocks.length - 1
                ? { after: quoteSpacing?.after }
                : {}),
            },
          });
        });
      }

      if (node.tagName in DOCX_HEADING) {
        return new Paragraph({
          ...paragraphOptions,
          ...ownKeepOptions,
          // `heading` is only a shorthand for a built-in style id and `w:pPr`
          // holds at most one `w:pStyle`: an explicit variant wins over the tag.
          style:
            variantNameToParagraphStyleId(elementsContext.variant) ??
            DOCX_HEADING[node.tagName as keyof typeof DOCX_HEADING],
          tabStops: toTabStops(node.children),
          children: node.children as ParagraphChild[],
        });
      }

      if (node.tagName === 'a') {
        const { href, id } = node.properties;
        // Run properties reach the link through the runs inside it; a
        // hyperlink carries nothing but its target.
        const children = node.children as ParagraphChild[];
        const link = !href
          ? children
          : href.startsWith(INTERNAL_HREF_PREFIX)
            ? new InternalHyperlink({
                children,
                anchor: toBookmarkName(href.slice(INTERNAL_HREF_PREFIX.length)),
              })
            : new ExternalHyperlink({ children, link: href });
        // An `<a id>` names a place in the document, which Word records as a
        // pair of marks around the runs rather than as a property of them.
        return id
          ? new Bookmark({
              id: toBookmarkName(id),
              children: Array.isArray(link) ? link : [link],
            })
          : link;
      }
    }

    if (node.type === 'root') {
      const rootChildren = toBlockChildren(
        node.children,
        parseParagraphOptions(fonts, contentOptions),
      );

      if (element.elementType === 'header') {
        return new Header({
          children: rootChildren as IHeaderOptions['children'],
        });
      }

      if (element.elementType === 'content') {
        return rootChildren;
      }

      if (element.elementType === 'footer') {
        return new Footer({
          children: rootChildren as IHeaderOptions['children'],
        });
      }
    }

    return node.children;
  });

  const { size, stacks, variants } = mappedDocument;

  const sections = stacks.flatMap(
    (
      {
        layouts,
        margin,
        content,
        continuous,
        columns: { columnGap, columnCount },
      },
      index,
    ) => {
      const currentSections: Array<ISectionOptions> = [];
      currentSections.push({
        properties: {
          titlePage: true,
          type: index > 0 && continuous ? SectionType.CONTINUOUS : undefined,
          page: toPageProperties(size, margin),
          ...(columnCount > 1 && {
            column: {
              count: columnCount,
              space: toWholeTwip(columnGap),
              separate: false, // adds visual separator
              equalWidth: true,
            },
          }),
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
      } satisfies ISectionOptions);

      // Prevent columns from filling entire page by adding second continuous section.
      if (columnCount > 1 && !stacks[index + 1]?.continuous) {
        currentSections.push({
          properties: {
            titlePage: true,
            type: SectionType.CONTINUOUS,
            page: toPageProperties(size, margin),
          },
          children: [],
        } satisfies ISectionOptions);
      }
      return currentSections;
    },
  );

  const styles = parseVariants(
    fontsOption ?? mappedDocument.fonts ?? {},
    variants,
  );

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
    numbering: listNumbering.toNumberingOptions(),
  });
};
