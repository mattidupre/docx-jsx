import {
  type FragmentationOption,
  type FragmentationProfileName,
  fragmentationBaseName,
  resolveFragmentationRules,
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

const createSplitters = (): Record<BlockKind, Splitter> => ({
  text: textSplitter,
  list: listSplitter,
  table: tableSplitter,
  atomic: atomicSplitter,
});

/** A new built-in profile, for one render. */
export const createFragmentationProfile = (
  name: FragmentationProfileName,
): FragmentationProfile => ({
  name,
  ...resolveFragmentationRules(name),
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
  if (option !== undefined && isFragmentationProfile(option)) {
    return option;
  }
  return {
    name: fragmentationBaseName(option),
    ...resolveFragmentationRules(option),
    splitters: createSplitters(),
  };
};
