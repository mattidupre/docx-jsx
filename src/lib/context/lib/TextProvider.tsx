import { createContext, useContext, useMemo } from 'src/react';
import { ReactNode } from 'react';
import {
  type TextConfig,
  type TextOptions,
  DEFAULT_TEXT_CONFIG,
  extendTextConfig,
} from '../entities';

const TextContext = createContext<TextConfig>(DEFAULT_TEXT_CONFIG);

export const useTextConfig = (options?: TextOptions) => {
  const prevConfig = useContext(TextContext);
  const config = useMemo(
    () => (options ? extendTextConfig(prevConfig, options) : prevConfig),
    [prevConfig, options],
  );
  return config;
};

type ProviderProps = { options: TextOptions; children?: ReactNode };

export function TextProvider({ options, children }: ProviderProps) {
  const value = useTextConfig(options);

  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

TextProvider.defaultProps = {
  children: null,
};
