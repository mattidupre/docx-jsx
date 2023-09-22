import {
  definePrimitiveElement,
  type Ignored,
  isIgnored,
  type Props,
} from '../lib/element';
import { type UnFlat, type Flat } from '../utils/array';
import {
  type DocXOptions,
  type DocXInstance,
  type DocXClassName,
} from '../lib/docXClasses';
import { parseChildren, type ExcludeChild } from '../utils/props';

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

const useProps = <TProps extends Props>(props: TProps) => {
  // TODO: useConfig here.

  return parseChildren(props, (child) => {
    if (isIgnored(child)) {
      return undefined;
    }

    if (typeof child === 'string' || typeof child === 'number') {
      return definePrimitiveElement('TextRun', { text: String(child) });
    }

    return child;
  }) as ExcludeChild<TProps, Ignored | string | number>;
};

export const TextRun = (props: DocXProps<'TextRun'>) =>
  definePrimitiveElement('TextRun', useProps(props));

export const Paragraph = (props: DocXProps<'Paragraph'>) =>
  definePrimitiveElement('Paragraph', useProps(props));

export const Table = (props: DocXProps<'Table'>) =>
  definePrimitiveElement('Table', useProps(props));

export const TableRow = (props: DocXProps<'TableRow'>) =>
  definePrimitiveElement('TableRow', useProps(props));

export const TableCell = (props: DocXProps<'TableCell'>) =>
  definePrimitiveElement('TableCell', useProps(props));

export const Header = (props: DocXProps<'Header'>) =>
  definePrimitiveElement('Header', useProps(props));

export const Footer = (props: DocXProps<'Footer'>) =>
  definePrimitiveElement('Footer', useProps(props));

export const Section = (props: DocXProps<'Section'>) =>
  definePrimitiveElement('Section', useProps(props));
