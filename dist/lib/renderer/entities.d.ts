import { type ReactElement } from 'react';
type IntrinsicType = string;
export type IntrinsicElement<TType extends string = string, TProps = any> = TType extends unknown ? ReactElement<TProps, TType> : never;
export declare const isAnyElement: (value: any) => value is ReactElement<any, string | import("react").JSXElementConstructor<any>>;
export declare const isIntrinsicElement: <TType extends string = string>(value: any, allowTypes?: readonly TType[] | undefined) => value is IntrinsicElement<TType, any>;
export declare function assertIntrinsicElement<TType extends IntrinsicType = IntrinsicType>(value: unknown, allowTypes?: ReadonlyArray<TType>): asserts value is IntrinsicElement<TType>;
export declare const asIntrinsicElement: <TType extends string = string>(value: unknown, allowTypes?: readonly TType[] | undefined) => IntrinsicElement<TType, any>;
export declare const isComponentElement: (value: any) => value is ReactElement<any, (...args: any) => any>;
export {};
