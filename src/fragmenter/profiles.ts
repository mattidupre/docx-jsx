import {
  DEFAULT_FRAGMENTATION,
  type FragmentationOption,
  type FragmentationProfileName,
  type FragmentationRules,
} from '../entities';
import type { BlockKind } from './model';
import {
  isFragmentationProfile,
  type FragmentationProfile,
  type Splitter,
} from './profile';
import { atomicSplitter } from './blocks/atomic';
import { listSplitter } from './blocks/list';
import { tableSplitter } from './blocks/table';
import { textSplitter } from './blocks/text';

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
  columns: { fill: 'balance-last' },
  quirks: { lineAfterColumns: false },
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
  columns: { fill: 'style' },
  quirks: { lineAfterColumns: false },
};

const BUILT_IN_RULES: Record<FragmentationProfileName, FragmentationRules> = {
  word: WORD_RULES,
  css: CSS_RULES,
};

const createSplitters = (): Record<BlockKind, Splitter> => ({
  text: textSplitter,
  list: listSplitter,
  table: tableSplitter,
  atomic: atomicSplitter,
});

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
  quirks: { ...rules.quirks, ...overrides.quirks },
});

/** A new built-in profile, for one render. */
export const createFragmentationProfile = (
  name: FragmentationProfileName,
): FragmentationProfile => ({
  name,
  ...mergeFragmentationRules(BUILT_IN_RULES[name], {}),
  splitters: createSplitters(),
});

/**
 * The profile one render uses: a profile passed in whole is used as it is,
 * a name creates that built-in, and rules are laid over the built-in they
 * extend. Nothing given means Word's rules.
 */
export const resolveFragmentationProfile = (
  option: undefined | FragmentationOption | FragmentationProfile,
): FragmentationProfile => {
  if (option === undefined || typeof option === 'string') {
    return createFragmentationProfile(option ?? DEFAULT_FRAGMENTATION);
  }
  if (isFragmentationProfile(option)) {
    return option;
  }
  const base = option.extends ?? DEFAULT_FRAGMENTATION;
  return {
    name: base,
    ...mergeFragmentationRules(BUILT_IN_RULES[base], option),
    splitters: createSplitters(),
  };
};
