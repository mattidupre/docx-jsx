import { createContext, type CSSProperties } from 'react';
import type { Except } from 'type-fest';
import type {
  DocumentConfig,
  StackConfig,
  ContentOptions,
  VariantName,
  VariantsConfig,
  DocumentType,
  PrefixesConfig,
} from '../entities';

export type ExtendableProps = {
  className?: string;
  style?: CSSProperties;
};

export type ContentProps = ContentOptions & {
  variant: VariantName;
};

export type ReactContentContextValue<
  T extends VariantsConfig = VariantsConfig,
> = {
  variants: T;
  prefixes: PrefixesConfig;
};

export const ReactContentContext = createContext<
  undefined | ReactContentContextValue
>(undefined);

export type ReactEnvironmentContextValue = {
  documentType: DocumentType;
  isPreview?: boolean;
};

export const ReactEnvironmentContext = createContext<
  undefined | ReactEnvironmentContextValue
>(undefined);

export type ReactDocumentContextValue = Except<
  DocumentConfig,
  'variants' | 'prefixes'
>;

export const ReactDocumentContext = createContext<
  undefined | ReactDocumentContextValue
>(undefined);

export const ReactStackContext = createContext<undefined | StackConfig>(
  undefined,
);
