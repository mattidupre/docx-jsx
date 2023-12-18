import { compact, merge } from 'lodash-es';
import {
  type DocumentOptions,
  type StackOptions,
  type ContentParagraphOptions,
  type ContentTextOptions,
  type DocumentConfig,
  type StackConfig,
  type Target,
  assignDocumentOptions,
  assignStackOptions,
  type VariantName,
  assignContentOptions,
  type ContentOptions,
} from './options';
import { mergeWithDefault } from 'src/utils/object';

export type EnvironmentContextOptions = {
  target: undefined | Target;
};

export type EnvironmentContext = {
  target: Target;
};

export const assignEnvironmentContext = (
  ...[args0, ...args]: ReadonlyArray<EnvironmentContextOptions>
): EnvironmentContext => {
  const newOptions: EnvironmentContextOptions = merge(args0, ...args);
  if (!newOptions.target) {
    newOptions.target = 'web';
  }
  return newOptions as EnvironmentContext;
};

type ElementsContextOptions = {
  document?: DocumentOptions;
  stack?: StackOptions;
  contentOptions?: ContentOptions;
  list?: { level: number };
  paragraph?: ContentParagraphOptions;
  text?: ContentTextOptions;
  variant?: VariantName;
};

export type ElementsContext = {
  document: DocumentConfig;
  stack: StackConfig;
  contentOptions: ContentOptions;
  list: { level: number };
  paragraph: ContentParagraphOptions;
  text: ContentTextOptions;
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
  Object.assign(args[0] ?? {}, {
    document: assignDocumentOptions(...pluckContext('document', ...args)),
    stack: assignStackOptions(...pluckContext('stack', ...args)),
    list: mergeWithDefault({ level: -1 }, ...pluckContext('list', ...args)),
    paragraph: assignContentOptions(...pluckContext('paragraph', ...args)),
    text: assignContentOptions(...pluckContext('paragraph', ...args)),
    variant: compact(pluckContext('variant', ...args)).at(-1),
    contentOptions: assignContentOptions(
      ...pluckContext('contentOptions', ...args),
    ),
  } satisfies ElementsContext);

/**
 * Once a variant is consumed it should not be passed down to its children.
 */
export const extractElementsContextConfig = <TKey extends 'text' | 'paragraph'>(
  key: TKey,
  elementsContext: ElementsContext,
): ElementsContext[TKey] => {
  const value = elementsContext[key];
  delete elementsContext[key];
  return value;
};
