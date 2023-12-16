import { createContext, type CSSProperties } from 'react';
import type {
  EnvironmentContext,
  DocumentConfig,
  StackConfig,
} from '../entities';

export type ExtendableProps = {
  className?: string;
  style?: CSSProperties;
};

export const ReactEnvironmentContext = createContext<
  undefined | EnvironmentContext
>(undefined);

export const ReactDocumentContext = createContext<undefined | DocumentConfig>(
  undefined,
);

export const ReactStackContext = createContext<undefined | StackConfig>(
  undefined,
);
