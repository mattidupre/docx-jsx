import { createContext, type HTMLAttributes } from 'react';
import type {
  DocumentConfig,
  StackConfig,
  ContentOptions,
  VariantName,
  DocumentType,
} from '../entities';

export type ExtendableProps = {
  className?: string;
  style?: HTMLAttributes<unknown>;
};

export type ContentProps = ContentOptions & {
  variant: VariantName;
};

export type ReactEnvironmentContextValue =
  | undefined
  | { documentType?: DocumentType; isWebPreview?: boolean };

export const ReactEnvironmentContext =
  createContext<ReactEnvironmentContextValue>(undefined);

export const ReactDocumentContext = createContext<undefined | DocumentConfig>(
  undefined,
);

export const ReactStackContext = createContext<undefined | StackConfig>(
  undefined,
);
