import { type Parser } from 'src/lib/parse';
import { type ReactNode } from 'react';
export declare const createRenderer: (parser: Parser) => (rootNode: ReactNode) => any;
