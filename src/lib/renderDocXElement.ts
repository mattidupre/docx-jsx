/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  type AsDocXInstance,
  createDocXInstance,
  isDocXInstance,
} from './docXClasses';
import {
  type AnyProps,
  type Node,
  type PrimitiveName,
  type PrimitiveElement,
  type FunctionElement,
  type Ignored,
  isElement,
  isPrimitiveElement,
  isFunctionElement,
  isIgnored,
  type AnyElement,
} from './entities';

/**
 * Convert a Primitive Element into a DocX instance.
 * This is necessary because templates are often stored separately from DocX.js
 * references, but the DocX renderer requires a singleton.
 */
const renderPrimitiveElement = <T extends PrimitiveElement>(
  element: T,
): AsDocXInstance<T['type']> => {
  // const { children, ...restProps } = element.props; // TODO: Uncomment, weird error.

  return createDocXInstance(
    element.type,
    renderProps(element.props) as any,
  ) as any;
};

/**
 * Call a Component Element or a Fragment Element.
 */
const callFunctionElement = <T extends FunctionElement>(element: T) =>
  element.type(renderProps(element.props));

/**
 * Recursively traverse the props looking for Primitive Elements to render.
 * Some Primitive Components will have DocX instances outside their children
 * props.
 */
function renderProps<T extends undefined | Record<string, any>>(
  props: T,
): GetRenderedProps<T> {
  if (props === undefined) {
    return {} as any;
  }
  return Object.fromEntries(
    Object.entries(props).map(([propsKey, thisProps]) => {
      if (isElement(thisProps)) {
        return [propsKey, renderElement(thisProps)];
      }

      if (Array.isArray(thisProps)) {
        return [
          propsKey,
          thisProps.reduce((arr, thisValue) => {
            if (isElement(thisValue)) {
              return arr.concat(renderElement(thisValue));
            }

            if (typeof thisValue === 'string') {
              console.log(JSON.stringify(thisValue));
            }

            // TODO: What to do with array of arrays?
            return [...arr, thisValue];
          }, []),
        ];
      }

      if (typeof thisProps === 'object' && thisProps !== null) {
        return [propsKey, renderProps(thisProps)];
      }

      return [propsKey, thisProps];
    }),
  ) as any;
}

export type GetRenderedProps<T extends undefined | AnyProps> =
  T extends undefined
    ? Record<string, never>
    : {
        [K in keyof T]: T[K] extends AnyElement
          ? GetRenderedElement<T[K]>
          : T[K] extends Array<infer I>
          ? Array<I extends AnyElement ? GetRenderedElement<I> : I>
          : T[K] extends ReadonlyArray<infer I>
          ? ReadonlyArray<I extends AnyElement ? GetRenderedElement<I> : I> & {
              length: T[K]['length'];
            }
          : T[K] extends Record<string, any>
          ? GetRenderedProps<T[K]>
          : T[K];
      };

/**
 * Flatten any Element into DocX Instances.
 */
export function renderElement<T extends AnyElement>(
  element: T,
): GetRenderedElement<T> {
  if (isIgnored(element)) {
    return null as any;
  }

  if (isPrimitiveElement(element)) {
    return renderPrimitiveElement(element) as any;
  }

  if (isFunctionElement(element)) {
    const returnedElement = callFunctionElement(element);
    if (Array.isArray(returnedElement)) {
      return returnedElement
        .flatMap((thisElement) => {
          return renderElement(thisElement);
        })
        .flat() as any;
    }
    return renderElement(returnedElement) as any;
  }

  if (isDocXInstance(element)) {
    return element as any;
  }

  throw new Error(`Unrecognized element "${JSON.stringify(element)}".`);
}

export type GetRenderedElement<T extends Node> = T extends Ignored
  ? null
  : T extends PrimitiveElement<infer N extends PrimitiveName>
  ? AsDocXInstance<N>
  : T extends FunctionElement
  ? T['type'] extends (...args: any) => infer N
    ? N extends ReadonlyArray<infer I extends Node>
      ? ReadonlyArray<GetRenderedElement<I>>
      : N extends Node
      ? GetRenderedElement<N>
      : never
    : never
  : never;

export { renderElement as renderDocXElement };
