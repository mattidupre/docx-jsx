import {
  type IntrinsicType,
  type IntrinsicElement,
  type AnyNode,
  asIntrinsicElement,
} from 'src/entities';
import { flattenNode } from './flattenNode';

const asChild = <TValue, TAllowEmpty extends undefined | boolean>(
  values: ReadonlyArray<TValue>,
  allowEmpty: TAllowEmpty,
): (TAllowEmpty extends true ? undefined : never) | TValue => {
  if (allowEmpty === true) {
    if (values.length > 1) {
      throw new TypeError('Expected at most one child.');
    }
  } else if (values.length !== 1) {
    throw new TypeError('Expected exactly one child.');
  }
  return values[0];
};

const asChildren = <TValue>(
  values: ReadonlyArray<TValue>,
  allowEmpty: undefined | boolean,
): ReadonlyArray<TValue> => {
  if (allowEmpty !== true && values.length === 0) {
    throw new TypeError('Expected at least one child.');
  }
  return values;
};

export type Parser = (context: ParserContext<Parser>) => any;

type ParseOptions = {
  types: ReadonlyArray<IntrinsicType>;
  allowEmpty?: boolean;
};

export type ParserContext<TParser extends Parser> = {
  element: undefined | IntrinsicElement;
  isRootElement: boolean;
  parseChildren: (
    node: AnyNode,
    options: ParseOptions,
  ) => ReadonlyArray<ReturnType<TParser>>;
  parseChild: <TRenderOptions extends ParseOptions>(
    node: AnyNode,
    options: ParseOptions,
  ) =>
    | (true extends TRenderOptions['allowEmpty'] ? undefined : never)
    | ReturnType<TParser>;
};

const createParserContext = <
  TElement extends undefined | IntrinsicElement,
  TParser extends Parser,
>(
  element: TElement,
  { isRoot: isRootElement, parser }: { isRoot: boolean; parser: TParser },
): ParserContext<TParser> => {
  const childParserOptions = { isRoot: false, parser } as const;
  return {
    element,
    isRootElement,
    parseChildren: (node, { allowEmpty, types }) => {
      const children = flattenNode(node);
      children.forEach((child) => {
        asIntrinsicElement(child, types);
      });
      return asChildren(children, allowEmpty).map((child) =>
        parser(
          createParserContext(asIntrinsicElement(child), childParserOptions),
        ),
      );
    },
    parseChild: (node, { allowEmpty, types }) => {
      const children = flattenNode(node);
      children.forEach((child) => {
        asIntrinsicElement(child, types);
      });
      return parser(
        createParserContext(asChild(children, allowEmpty), childParserOptions),
      );
    },
  };
};

export const parseNode = <
  TOptions extends Pick<ParseOptions, 'types'> & {
    isRoot: boolean;
    parser: Parser;
  },
>(
  node: AnyNode,
  { types, ...options }: TOptions,
) =>
  createParserContext(undefined, options).parseChild(node, {
    types,
    allowEmpty: false,
  });
