import {
  type AnyProps,
  type PrimitiveName,
  type PrimitiveElement,
  type PrimitiveProps,
} from './entities';

export const definePrimitiveComponent =
  <
    TName extends PrimitiveName,
    TFn extends (props: AnyProps) => PrimitiveElement,
  >(
    type: TName,
    createPrimitiveElement: TFn = (props: PrimitiveProps<TName>) =>
      ({
        type,
        props,
      }) as PrimitiveElement<TName>,
  ) =>
  (props: Parameters<TFn>[0]) =>
    createPrimitiveElement(props);

type AddStringChildren<P extends AnyProps & { children?: any }> = Omit<
  P,
  'children'
> & { children?: string | P['children'] };

const parseTextProp = <P extends AnyProps>({
  children,
  text,
  ...restProps
}: P): P => {
  if (text && children?.length) {
    throw new Error('Cannot set text and children prop.');
  }
  if (typeof children === 'string') {
    return {
      text: children,
      ...restProps,
    } as any;
  }
  return {
    children,
    text,
    ...restProps,
  } as any;
};

export const TextRun = definePrimitiveComponent('TextRun');
export const Paragraph = definePrimitiveComponent(
  'Paragraph',
  (props: AddStringChildren<PrimitiveProps<'Paragraph'>>) => ({
    type: 'Paragraph',
    props: parseTextProp(props),
  }),
);
export const Table = definePrimitiveComponent('Table');
export const TableRow = definePrimitiveComponent('TableRow');
export const TableCell = definePrimitiveComponent('TableCell');
export const Header = definePrimitiveComponent('Header');
export const Footer = definePrimitiveComponent('Footer');
