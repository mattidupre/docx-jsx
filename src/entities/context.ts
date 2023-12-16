import { merge } from 'lodash-es';
import {
  type DocumentOptions,
  type StackOptions,
  type ParagraphOptions,
  type TextOptions,
  type DocumentConfig,
  type StackConfig,
  type Target,
  assignDocumentOptions,
  assignStackOptions,
  assignParagraphOptions,
  assignTextOptions,
} from './options';

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
  paragraph?: ParagraphOptions;
  text?: TextOptions;
};

export type ElementsContext = {
  document: undefined | DocumentConfig;
  stack: undefined | StackConfig;
  paragraph: undefined | ParagraphOptions;
  text: undefined | TextOptions;
};

const assignElementsContextValue = <T extends keyof ElementsContext>(
  key: T,
  [targetOption = {}, ...options]: ReadonlyArray<
    ElementsContextOptions | ElementsContext | undefined
  >,
): undefined | ElementsContext[T] => {
  const values = options.flatMap((option) => option?.[key] || []);
  switch (key) {
    case 'document':
      return assignDocumentOptions(
        targetOption.document,
        ...values,
      ) as ElementsContext[T];
    case 'stack':
      return assignStackOptions(
        targetOption.stack,
        ...values,
      ) as ElementsContext[T];
    case 'paragraph':
      return assignParagraphOptions(
        targetOption.paragraph,
        ...values,
      ) as ElementsContext[T];
    case 'text':
      return assignTextOptions(
        targetOption.text,
        ...values,
      ) as ElementsContext[T];
    default:
      throw new TypeError('Invalid key.');
  }
};

export const assignElementsContext = (
  ...args: ReadonlyArray<
    Record<string, unknown> &
      (ElementsContextOptions | ElementsContext | undefined)
  >
): ElementsContext =>
  Object.assign(args[0], {
    document: assignElementsContextValue('document', args),
    stack: assignElementsContextValue('stack', args),
    paragraph: assignElementsContextValue('paragraph', args),
    text: assignElementsContextValue('text', args),
  });
