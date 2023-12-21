import { compact } from 'lodash-es';
import { assignDefined, mergeWithDefault } from '../utils/object.js';
import {
  type DocumentOptions,
  type StackOptions,
  type DocumentConfig,
  type StackConfig,
  assignDocumentOptions,
  assignStackOptions,
  type VariantName,
  assignContentOptions,
  type ContentOptions,
} from './options';

type ElementsContextOptions = {
  document?: DocumentOptions;
  stack?: StackOptions;
  contentOptions?: ContentOptions;
  list?: { level: number };
  variant?: VariantName;
};

export type ElementsContext = {
  document: DocumentConfig;
  stack: StackConfig;
  contentOptions: ContentOptions;
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
    contentOptions: assignContentOptions(
      ...pluckContext('contentOptions', ...args),
    ),
  } satisfies ElementsContext);
