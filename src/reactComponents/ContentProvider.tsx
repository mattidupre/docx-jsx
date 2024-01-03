import { useContext, type ReactNode, useMemo } from 'react';
import { isEqual } from 'lodash';
import {
  assignPrefixesOptions,
  assignVariants,
  type Variants,
} from '../entities';
import { createStyleString } from '../lib/styles';
import { ReactContentContext, type ReactContentContextValue } from './entities';
import { useEnvironment } from './useEnvironment';
import { useInjectStyleSheets } from './useInjectStyleSheets';

export type ContentProviderProps<T extends Variants = Variants> = Partial<
  ReactContentContextValue<T>
> & {
  injectEnvironmentCss?: boolean;
  children: ReactNode;
};

export function ContentProvider<T extends Variants = Variants>({
  children,
  ...props
}: ContentProviderProps<T>) {
  const { variants, prefixes, injectEnvironmentCss } = props;
  const { variants: prevVariants, prefixes: prevPrefixes } =
    useContext(ReactContentContext) ?? {};

  const contextValue = useMemo(() => {
    if (prevVariants && variants && !isEqual(variants, prevVariants)) {
      throw new Error('Do not nest differing variants');
    }
    if (prevPrefixes && prefixes && !isEqual(prefixes, prevPrefixes)) {
      throw new Error('Do not nest differing prefixes');
    }
    return {
      variants: assignVariants({}, prevVariants, variants),
      prefixes: assignPrefixesOptions({}, prevPrefixes, prefixes),
    };
  }, [variants, prevVariants, prefixes, prevPrefixes]);

  const { documentType } = useEnvironment({
    disableAssert: true,
  });

  const environmentStyleSheets = useMemo(
    () =>
      documentType === 'web' && injectEnvironmentCss
        ? [createStyleString(contextValue)]
        : [],
    [contextValue, documentType, injectEnvironmentCss],
  );

  useInjectStyleSheets(environmentStyleSheets);

  return (
    <ReactContentContext.Provider value={contextValue}>
      {children}
    </ReactContentContext.Provider>
  );
}
