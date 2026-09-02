import {
  AlignmentType,
  LevelFormat,
  type ILevelsOptions,
  type INumberingOptions,
} from 'docx';
import { range } from 'lodash';
import type { ListContext, ListFormat, UnitsSize } from '../../entities';
import { toTwip } from './entities';

/**
 * Word numbers at most nine levels, `w:ilvl` 0 to 8, and rejects a tenth.
 * Every abstract numbering declares all nine so a list nested deeper than the
 * document that declared it still has a level to sit at.
 */
const LIST_LEVEL_COUNT = 9;

export const MAX_LIST_LEVEL = LIST_LEVEL_COUNT - 1;

/**
 * How far each level is indented, and how far the marker hangs back into that
 * indent. These are Word's own defaults for a bulleted list, which is what the
 * browser's `padding-inline-start: 40px` on a `<ul>` comes out closest to.
 */
const DEFAULT_LIST_INDENT: UnitsSize = '0.5in';

const LIST_HANGING_INDENT: UnitsSize = '0.25in';

const DOCX_LEVEL_FORMATS = {
  decimal: LevelFormat.DECIMAL,
  lowerLetter: LevelFormat.LOWER_LETTER,
  upperLetter: LevelFormat.UPPER_LETTER,
  lowerRoman: LevelFormat.LOWER_ROMAN,
  upperRoman: LevelFormat.UPPER_ROMAN,
  bullet: LevelFormat.BULLET,
} as const satisfies Record<
  ListFormat,
  (typeof LevelFormat)[keyof typeof LevelFormat]
>;

/**
 * The markers a browser draws for `list-style-type: disc`, `circle` and
 * `square`, which is what nested `<ul>`s cycle through.
 */
const BULLET_TEXTS = ['●', '○', '■'] as const;

const UNSAFE_REFERENCE_CHARACTERS = /[^0-9A-Za-z]/g;

/**
 * The id of the abstract numbering a list uses. Lists that draw the same
 * markers at the same indents share one, and `docx` gives each numbering
 * instance a `w:num` of its own, so sharing a definition never makes two lists
 * continue each other's count.
 *
 * `docx` writes the reference into `w:numId` verbatim and later replaces it by
 * a regular expression, so it is reduced to characters that mean nothing to
 * one.
 *
 * @example
 * listNumberingReference({ format: 'lowerRoman', start: 3, indent: '0.25in' });
 * // 'list-lowerRoman-3-025in'
 */
export const listNumberingReference = ({
  format,
  start,
  indent = DEFAULT_LIST_INDENT,
}: Pick<ListContext, 'format' | 'start' | 'indent'>): string =>
  [
    'list',
    format,
    start,
    indent.replace(UNSAFE_REFERENCE_CHARACTERS, ''),
  ].join('-');

/**
 * The nine levels of one abstract numbering: the same marker format at every
 * depth, indented one step further each time, and starting at `start`.
 *
 * Word restarts a level whenever the level above it advances, so declaring
 * `start` on every level is what makes a nested list begin at it as well.
 */
export const listNumberingLevels = ({
  format,
  start,
  indent = DEFAULT_LIST_INDENT,
}: Pick<ListContext, 'format' | 'start' | 'indent'>): ReadonlyArray<
  ILevelsOptions
> => {
  const indentTwip = Math.round(toTwip(indent));
  const hangingTwip = Math.round(toTwip(LIST_HANGING_INDENT));
  return range(LIST_LEVEL_COUNT).map((level) => ({
    level,
    format: DOCX_LEVEL_FORMATS[format],
    // `%1` is the counter of level 0, `%2` of level 1, and so on: a level shows
    // its own number only, exactly like a CSS list marker.
    text:
      format === 'bullet'
        ? BULLET_TEXTS[level % BULLET_TEXTS.length]
        : `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    start,
    style: {
      paragraph: {
        indent: { left: indentTwip * (level + 1), hanging: hangingTwip },
      },
    },
  }));
};

/**
 * Collects the abstract numberings a document needs while its lists are being
 * mapped, so the `Document` can be given exactly the definitions its paragraphs
 * reference and no others.
 */
export const createListNumbering = () => {
  const levelsByReference = new Map<string, ReadonlyArray<ILevelsOptions>>();

  return {
    /** Declares the numbering a list needs and returns its reference. */
    useList: (list: ListContext): string => {
      const reference = listNumberingReference(list);
      if (!levelsByReference.has(reference)) {
        levelsByReference.set(reference, listNumberingLevels(list));
      }
      return reference;
    },
    toNumberingOptions: (): INumberingOptions => ({
      config: [...levelsByReference].map(([reference, levels]) => ({
        reference,
        levels,
      })),
    }),
  };
};
