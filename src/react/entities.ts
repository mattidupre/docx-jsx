import { createContext, type CSSProperties } from 'react';
import type {
  DocumentConfig,
  StackConfig,
  ContentOptions,
  VariantName,
  DocumentType,
} from '../entities';

export type ExtendableProps = {
  className?: string;
  style?: CSSProperties;
};

export type ContentProps = ContentOptions & {
  variant: VariantName;
};

export type ReactEnvironmentContextValue =
  | undefined
  | { documentType?: DocumentType; isPreview?: boolean };

export const ReactEnvironmentContext =
  createContext<ReactEnvironmentContextValue>(undefined);

export const ReactDocumentContext = createContext<undefined | DocumentConfig>(
  undefined,
);

export const ReactStackContext = createContext<undefined | StackConfig>(
  undefined,
);
