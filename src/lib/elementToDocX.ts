/* eslint-disable @typescript-eslint/no-use-before-define */
import { isProps } from '../utils/props';
import { renderComponentWrapper } from './renderWrapper';
import {
  type DocXClassName,
  type AsDocXInstance,
  type DocXInstance,
  createDocXInstance,
  isDocXInstance,
} from './docXClasses';
import {
  type Node,
  type PrimitiveName,
  type PrimitiveElement,
  type FunctionElement,
  type Ignored,
  isElement,
  isPrimitiveElement,
  isFunctionElement,
  isIgnored,
  type Element,
  type Props,
} from './element';

/**
 * Convert a Primitive Element into a DocX instance.
 * This is necessary because templates are often stored separately from DocX.js
 * references, but the DocX renderer requires a singleton.
 */
const renderPrimitiveElement = <T extends PrimitiveElement>(
  element: T,
): T['type'] extends DocXClassName ? AsDocXInstance<T['type']> : never => {
  return createDocXInstance(
    element.type,
    renderPrimitiveProps(element.props) as any,
  ) as any;
};

/**
 * Call a Component Element or a Fragment Element.
 */
const callFunctionElement = <T extends FunctionElement>(
  element: T,
): ReturnType<T['type']> => element.type(element.props) as any; // TODO: Fix this any

type GetRenderedPrimitiveProps<T extends undefined | Props> =
  T extends undefined
    ? Record<string, never>
    : {
        [K in keyof T]: T[K] extends Element
          ? GetRenderedNode<T[K]>
          : T[K] extends Array<infer I>
          ? Array<I extends Element ? GetRenderedNode<I> : I>
          : T[K] extends ReadonlyArray<infer I>
          ? ReadonlyArray<I extends Element ? GetRenderedNode<I> : I> & {
              length: T[K]['length'];
            }
          : T[K] extends Record<string, any>
          ? GetRenderedPrimitiveProps<T[K]>
          : T[K];
      };

/**
 * Recursively traverse the props looking for Primitive Elements to render.
 * Some Primitive Components will have DocX instances outside their children
 * props.
 */
function renderPrimitiveProps<T extends undefined | Props>(
  props: T,
): GetRenderedPrimitiveProps<T> {
  if (props === undefined) {
    return {} as any;
  }

  const keys = Object.keys(props);
  return Object.fromEntries(
    Object.values(props)
      .map((thisProps) => {
        if (isElement(thisProps)) {
          // @ts-ignore prevent recursive type errors.
          return renderNode(thisProps);
        }

        if (Array.isArray(thisProps)) {
          return thisProps.reduce(
            (arr, thisValue) =>
              isElement(thisValue)
                ? arr.concat(renderNode(thisValue))
                : [...arr, thisValue],
            [],
          );
        }

        if (isProps(thisProps)) {
          return renderPrimitiveProps(thisProps);
        }

        return thisProps;
      })
      .map((value, index) => [keys[index], value]),
  ) as any;
}

export type GetRenderedNode<T extends Node> = T extends Ignored
  ? null
  : T extends ReadonlyArray<infer I extends Node>
  ? GetRenderedNode<I>
  : T extends PrimitiveElement<any, infer N extends PrimitiveName>
  ? AsDocXInstance<N>
  : T extends FunctionElement
  ? T['type'] extends (...args: any) => infer N
    ? N extends ReadonlyArray<infer I extends Node>
      ? ReadonlyArray<GetRenderedNode<I>>
      : N extends Node
      ? GetRenderedNode<N>
      : never
    : never
  : never;

/**
 * Flatten any Element into DocX Instances.
 */
export function renderNode<TNode extends Node>(
  node: TNode,
): ReadonlyArray<DocXInstance> {
  if (isIgnored(node)) {
    return [];
  }

  if (isDocXInstance(node)) {
    return [node];
  }

  if (isPrimitiveElement(node)) {
    return [renderPrimitiveElement(node)];
  }

  if (isFunctionElement(node)) {
    return renderComponentWrapper(() => {
      const returnedElement = callFunctionElement(node);

      if (Array.isArray(returnedElement)) {
        return returnedElement.flatMap((thisElement) =>
          renderNode(thisElement),
        );
      }

      return renderNode(returnedElement as any);
    });
  }

  throw new Error(`Unrecognized element "${JSON.stringify(node)}".`);
}

export { renderNode as elementToDocX };
