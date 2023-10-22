/// <reference types="node" />
/// <reference types="node" />
import { type ReactNode } from 'react';
export declare const renderToDocx: (rootNode: ReactNode) => any;
export declare const renderDocumentToDocxBuffer: (documentEl: ReactNode) => Promise<Buffer>;
export declare const renderDocumentToDocxStream: (documentEl: ReactNode) => Promise<import("stream").Stream>;
export declare const renderDocumentToDocxXml: (documentEl: ReactNode) => Promise<string>;
