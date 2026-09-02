import { compact } from 'lodash';
import { assignDefined, mergeWithDefault } from '../utils/object';
import {
  type DocumentOptions,
  type StackOptions,
  type DocumentConfig,
  type StackConfig,
  assignDocumentOptions,
  assignStackOptions,
} from './options';
import {
  type TypographyOptions,
  assignTypographyOptions,
  type VariantName,
} from './typography';
import type { ListFormat } from './elements';
import type { UnitsSize } from './units';

/**
 * The list a content element sits in.
 *
 * `level` is the nesting depth, counted from 0 for a list that is not inside
 * another one, and -1 outside of any list. `instance` numbers the list itself:
 * every `<ol>`/`<ul>` opens one, so two lists never continue each other's
 * numbering, which is what both CSS and Word's concrete numbering do.
 */
export type ListContext = {
  level: number;
  instance: number;
  format: ListFormat;
  start: number;
  indent: undefined | UnitsSize;
};

const DEFAULT_LIST_CONTEXT: ListContext = {
  level: -1,
  instance: -1,
  format: 'bullet',
  start: 1,
  indent: undefined,
};

type ElementsContextOptions = {
  document?: DocumentOptions;
  stack?: StackOptions;
  // TODO: Rename to TypographyOptions
  contentOptions?: TypographyOptions;
  isInsideParagraph?: boolean;
  isInsideColumn?: boolean;
  isHtmlRaw?: boolean;
  isInsideHyperlink?: boolean;
  list?: Partial<ListContext>;
  variant?: VariantName;
};

export type ElementsContext = {
  document: DocumentConfig;
  stack: StackConfig;
  contentOptions: TypographyOptions;
  isInsideParagraph: boolean;
  isInsideColumn: boolean;
  isHtmlRaw: boolean;
  isInsideHyperlink: boolean;
  list: ListContext;
  variant: undefined | VariantName;
};

const pluckContext = <TKey extends keyof ElementsContext>(
  key: TKey,
  ...args: ReadonlyArray<undefined | ElementsContext | ElementsContextOptions>
) =>
  args.reduce(
    (target, obj) => {
      target.push(obj?.[key]);
      return target;
    },
    [] as Array<undefined | ElementsContextOptions[TKey]>,
  );

export const assignElementsContext = (
  ...args: ReadonlyArray<
    | undefined
    | (Record<string, unknown> &
        (ElementsContextOptions | ElementsContext | undefined))
  >
): ElementsContext =>
  assignDefined((args[0] ?? {}) as ElementsContext, {
    document: assignDocumentOptions(...pluckContext('document', ...args)),
    stack: assignStackOptions(...pluckContext('stack', ...args)),
    list: mergeWithDefault(DEFAULT_LIST_CONTEXT, ...pluckContext('list', ...args)),
    variant: compact(pluckContext('variant', ...args)).at(-1),
    contentOptions: assignTypographyOptions(
      ...pluckContext('contentOptions', ...args),
    ),
    isInsideParagraph: !!compact(pluckContext('isInsideParagraph', ...args)).at(
      -1,
    ),
    isInsideColumn: !!compact(pluckContext('isInsideColumn', ...args)).at(-1),
    isHtmlRaw: !!compact(pluckContext('isHtmlRaw', ...args)).at(-1),
    isInsideHyperlink: !!compact(
      pluckContext('isInsideHyperlink', ...args),
    ).at(-1),
  } satisfies ElementsContext);
