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
  };
  quirks: {
    /**
     * Word's empty trailing continuous section after columns costs one line
     * (research B1). Off unless a document asks to emulate it.
     */
    lineAfterColumns: boolean;
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
