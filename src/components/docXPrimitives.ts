import {
  type Ignored,
  isIgnored,
  type Props,
  createElement,
} from '../lib/element';
import { type UnFlat, type Flat } from '../utils/utilities';
import {
  type DocXOptions,
  type DocXInstance,
  type DocXClassName,
} from '../lib/docXClasses';
import { parseOverChildren, type ExcludeChild } from '../utils/props';
import { useIsDocX } from '../lib/useIsDocX';
import { useDocumentContext } from '../lib/documentContext';

// Primitives exist because if a component returns a DocXElement directly,
// and those primitives are defined in a different package than where they are
// rendered, the DocX renderer will fail.

type DocXChild<T> = T extends DocXInstance
  ?
      | T // Allow direct DocX instances for debugging purposes.
      | JSX.Element
  : T;

type MapDocXProps<TOptions> = TOptions extends Record<string, unknown>
  ? {
      [K in keyof TOptions]: MapDocXProps<TOptions[K]>;
    }
  : TOptions extends ReadonlyArray<infer I>
  ? ReadonlyArray<MapDocXProps<I>>
  : DocXChild<TOptions>;

type DocXProps<TName extends DocXClassName> = {
  [K in keyof DocXOptions<TName>]: K extends 'children'
    ? UnFlat<Ignored | string | number | DocXChild<Flat<DocXOptions<TName>[K]>>>
    : MapDocXProps<DocXOptions<TName>[K]>;
};

const parseDocXProps = <TProps extends Props>(props: TProps) => {
  // TODO: useConfig here.

  return parseOverChildren(props, (child) => {
    if (isIgnored(child)) {
      return undefined;
    }

    if (typeof child === 'string' || typeof child === 'number') {
      return createElement('TextRun', { text: String(child) });
    }

    return child;
  }) as ExcludeChild<TProps, Ignored | string | number>;
};

export const TextRun = (props: DocXProps<'TextRun'>): JSX.Element => {
  console.log('Document Context:', useDocumentContext());

  if (useIsDocX()) {
    return createElement('TextRun', parseDocXProps(props));
  }

  return createElement('span', { children: props.children });
};

export const Paragraph = (props: DocXProps<'Paragraph'>) =>
  createElement('Paragraph', parseDocXProps(props));

export const Table = (props: DocXProps<'Table'>) =>
  createElement('Table', parseDocXProps(props));

export const TableRow = (props: DocXProps<'TableRow'>) =>
  createElement('TableRow', parseDocXProps(props));

export const TableCell = (props: DocXProps<'TableCell'>) =>
  createElement('TableCell', parseDocXProps(props));

export const Header = (props: DocXProps<'Header'>) =>
  createElement('Header', parseDocXProps(props));

export const Footer = (props: DocXProps<'Footer'>) =>
  createElement('Footer', parseDocXProps(props));

export const Section = (props: DocXProps<'Section'>) =>
  createElement('Section', parseDocXProps(props));
