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

type ElementsContextOptions = {
  document?: DocumentOptions;
  stack?: StackOptions;
  // TODO: Rename to TypographyOptions
  contentOptions?: TypographyOptions;
  isInsideParagraph?: boolean;
  isHtmlRaw?: boolean;
  list?: { level: number };
  variant?: VariantName;
};

export type ElementsContext = {
  document: DocumentConfig;
  stack: StackConfig;
  contentOptions: TypographyOptions;
  isInsideParagraph: boolean;
  isHtmlRaw: boolean;
  list: { level: number };
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
    list: mergeWithDefault({ level: -1 }, ...pluckContext('list', ...args)),
    variant: compact(pluckContext('variant', ...args)).at(-1),
    contentOptions: assignTypographyOptions(
      ...pluckContext('contentOptions', ...args),
    ),
    isInsideParagraph: !!compact(pluckContext('isInsideParagraph', ...args)).at(
      -1,
    ),
    isHtmlRaw: !!compact(pluckContext('isHtmlRaw', ...args)).at(-1),
  } satisfies ElementsContext);
