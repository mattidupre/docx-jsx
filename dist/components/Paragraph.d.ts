/// <reference types="react" />
import { type IntrinsicElementProps } from 'src/entities';
export declare function Paragraph<TProps extends IntrinsicElementProps['paragraph']>({ children, ...options }: TProps): string | number | boolean | import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | Iterable<import("react").ReactNode> | import("react").FunctionComponentElement<Omit<TProps, "children">> | null | undefined;
