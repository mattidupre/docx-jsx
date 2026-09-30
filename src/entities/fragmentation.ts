/**
 * The conventions a document is paginated by in the DOM and PDF targets, as
 * data. A document chooses them on `DocumentProvider`, and the choice travels
 * with the rest of its options through the HTML, so only data belongs here;
 * the hooks a full profile may add are passed to the render call instead.
 */

/**
 * Why a box (a page or a column) begins where it does:
 * - `stack`: a stack that starts a page of its own;
 * - `break`: a forced break (a `Break`, `break-before: page`);
 * - `natural`: the page before it was full;
 * - `column`: a column after the first one on a page.
 */
export type FragmentationStartKind = 'stack' | 'break' | 'natural' | 'column';

export type FragmentationRules = {
  margins: {
    /**
     * How the bottom margin of one block and the top margin of the next
     * combine: the larger wins (`collapse`, CSS and Word), or they are added
     * (`sum`, native ODF).
     */
    adjacent: 'collapse' | 'sum';
    /**
     * Whether the top margin of the first block in a box is kept, by how the
     * box started. Word keeps it only at the start of a section; css-break-3
     * truncates it at unforced breaks only.
     */
    keepAtTop: Record<FragmentationStartKind, boolean>;
  };
  /**
   * The fewest lines of a paragraph left at the bottom of a box (`orphans`)
   * and carried to the top of the next (`widows`): a number, or `style` for
   * the element's computed `orphans` / `widows`.
   */
  lines: {
    orphans: number | 'style';
    widows: number | 'style';
  };
  tables: {
    /**
     * Whether a row that is not kept together may split between its lines
     * (`unless-kept`, Word) or tables only break between rows (`never`, CSS).
     * A row taller than a whole page splits either way.
     */
    splitRows: 'unless-kept' | 'never';
    /**
     * Whether a continued table repeats its header rows: as the table's
     * `repeatHeader` option says, never, or always.
     */
    repeatHeader: 'option' | 'never' | 'always';
  };
  columns: {
    /**
     * How columns are filled: one after another with the last page balanced
     * (Word), every page balanced, one after another without balancing, or
     * as the multi-column element's computed `column-fill` says.
     */
    fill: 'balance-last' | 'balance-all' | 'sequential' | 'style';
    /**
     * How a DOCX ends a column stack whose next stack starts a new page. Word
     * balances columns only when they end at a continuous section break, and
     * that break needs a paragraph to hold it:
     * - `line`: an ordinary empty paragraph, the form Word itself uses when
     *   columns are applied to a selection. Easy to find and edit.
     * - `minimal`: the same paragraph cut to a one point line. Nearly
     *   invisible, so easy to delete by accident.
     * - `page-break-before`: no extra paragraph. The next stack starts with a
     *   continuous section break and a page break before its first paragraph.
     *   Falls back to `line` where that cannot work: no next stack, a next
     *   stack that starts with a table or has other margins.
     *
     * The paragraph sits below the balanced columns on a page the next stack
     * does not share, so no choice changes where anything else is laid out.
     */
    endBeforePage: 'line' | 'minimal' | 'page-break-before';
  };
};

export const FRAGMENTATION_PROFILE_NAMES = ['word', 'css'] as const;

export type FragmentationProfileName =
  (typeof FRAGMENTATION_PROFILE_NAMES)[number];

/**
 * A built-in profile by name, or rules over one: every field left out is the
 * base profile's (`word` unless `extends` says otherwise).
 */
export type FragmentationOption =
  | FragmentationProfileName
  | ({ extends?: FragmentationProfileName } & {
      [TKey in keyof FragmentationRules]?: Partial<FragmentationRules[TKey]>;
    });

export const DEFAULT_FRAGMENTATION: FragmentationProfileName = 'word';

/**
 * Word's rules, as measured against Word 16 (`flow-parity.md`):
 * - adjacent margins collapse to the larger one;
 * - space-before stays at the top of a section's first page and is dropped
 *   at the top of every other page and column;
 * - widow/orphan control of two lines, which Word applies by default;
 * - rows split between their lines unless kept together (the library keeps
 *   them together by default), and header rows repeat when the table asks;
 * - columns fill one after another, and the last page is balanced.
 */
const WORD_RULES: FragmentationRules = {
  margins: {
    adjacent: 'collapse',
    keepAtTop: { stack: true, break: false, natural: false, column: false },
  },
  lines: { orphans: 2, widows: 2 },
  tables: { splitRows: 'unless-kept', repeatHeader: 'option' },
  columns: { fill: 'balance-last', endBeforePage: 'line' },
};

/**
 * css-break-3: margins are truncated at unforced breaks only, `orphans` and
 * `widows` come from the computed style, tables break between rows without
 * repeating a header, and columns fill as `column-fill` says.
 */
const CSS_RULES: FragmentationRules = {
  margins: {
    adjacent: 'collapse',
    keepAtTop: { stack: true, break: true, natural: false, column: false },
  },
  lines: { orphans: 'style', widows: 'style' },
  tables: { splitRows: 'never', repeatHeader: 'never' },
  columns: { fill: 'style', endBeforePage: 'line' },
};

const BUILT_IN_RULES: Record<FragmentationProfileName, FragmentationRules> = {
  word: WORD_RULES,
  css: CSS_RULES,
};

/**
 * Lays `overrides` over `rules` one group at a time, so an override names
 * only the knobs it changes.
 */
export const mergeFragmentationRules = (
  rules: FragmentationRules,
  overrides: Exclude<FragmentationOption, string>,
): FragmentationRules => ({
  margins: {
    ...rules.margins,
    ...overrides.margins,
    keepAtTop: {
      ...rules.margins.keepAtTop,
      ...overrides.margins?.keepAtTop,
    },
  },
  lines: { ...rules.lines, ...overrides.lines },
  tables: { ...rules.tables, ...overrides.tables },
  columns: { ...rules.columns, ...overrides.columns },
});

/** The name of the built-in profile an option starts from. */
export const fragmentationBaseName = (
  option: undefined | FragmentationOption,
): FragmentationProfileName =>
  option === undefined
    ? DEFAULT_FRAGMENTATION
    : typeof option === 'string'
      ? option
      : (option.extends ?? DEFAULT_FRAGMENTATION);

/**
 * The rules a document's `fragmentation` option stands for: a built-in
 * profile's, with any overrides laid over them. Every target reads its rules
 * from here, so the DOM, PDF and DOCX agree on one set.
 */
export const resolveFragmentationRules = (
  option: undefined | FragmentationOption,
): FragmentationRules =>
  mergeFragmentationRules(
    BUILT_IN_RULES[fragmentationBaseName(option)],
    option === undefined || typeof option === 'string' ? {} : option,
  );
