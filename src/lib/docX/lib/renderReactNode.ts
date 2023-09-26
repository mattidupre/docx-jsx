import { type ReactNode } from 'react';
import { asArray, Flat } from 'src/utils/utilities';
import {
  isFunctionElement,
  isIgnored,
  isFragmentElement,
  type FunctionElement,
  type IntrinsicElement,
  type StringElement,
} from '../entities';

type Child = StringElement | IntrinsicElement;

type ParseChild = undefined | { (child: Child): unknown };

type ParsedChild<TParseChild extends ParseChild> = TParseChild extends undefined
  ? Child
  : TParseChild extends ParseChild
  ? ReturnType<NonNullable<TParseChild>>
  : never;

type ExpectSingle = undefined | boolean;

type RenderNodeReturn<
  TParseChild extends ParseChild,
  TExpectSingle extends ExpectSingle,
> = TExpectSingle extends true
  ? Flat<ParsedChild<TParseChild>>
  : ReadonlyArray<NonNullable<Flat<ParsedChild<TParseChild>>>>;

type RenderNodeOptions<
  TParseChild extends ParseChild,
  TExpectSingle extends ExpectSingle,
> = {
  parseChild?: TParseChild;
  expectSingle?: TExpectSingle;
};

const renderChild = <
  TParseChild extends ParseChild,
  TExpectSingle extends ExpectSingle,
>(
  child: Child,
  {
    expectSingle,
    parseChild = (v) => v,
  }: RenderNodeOptions<TParseChild, TExpectSingle>,
): RenderNodeReturn<TParseChild, TExpectSingle> => {
  const children = asArray(child).flatMap((c) => {
    if (isIgnored(c)) {
      return [];
    }
    return parseChild(c);
  });
  if (expectSingle === true) {
    if (children.length > 1) {
      throw new Error('Must render at most one value.');
    }
    return children[0];
  }
  return children;
};

const renderFunctionElement = (functionElement: FunctionElement) =>
  functionElement.type(functionElement.props);

export const renderReactNode = <
  TParseChild extends ParseChild,
  TExpectSingle extends ExpectSingle,
>(
  node: ReactNode,
  options: RenderNodeOptions<TParseChild, TExpectSingle> = {},
): RenderNodeReturn<TParseChild, TExpectSingle> => {
  if (Array.isArray(node)) {
    return renderChild(
      node.flatMap((n) =>
        renderReactNode(n, { ...options, expectSingle: false }),
      ),
      options,
    );
  }

  if (isFragmentElement(node)) {
    return renderChild(
      asArray(node.props.children).flatMap((n) =>
        renderReactNode(n, { ...options, expectSingle: false }),
      ),
      options,
    );
  }

  if (isFunctionElement(node)) {
    return renderReactNode(renderFunctionElement(node), options);
  }

  return renderChild(node, options);
};
