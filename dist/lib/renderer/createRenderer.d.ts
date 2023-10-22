import { type Parser } from 'src/entities';
import { type ReactElement, type ReactNode } from 'react';
export declare const createRenderer: (rootType: 'document', parser: Parser) => (rootNode: ReactNode) => ReactElement<any, string | import("react").JSXElementConstructor<any>> | undefined;
