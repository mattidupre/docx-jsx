import { useContext, type ReactNode, useMemo } from 'react';
import { isEqual } from 'lodash';
import {
  assignPrefixesOptions,
  assignVariants,
  type Variants,
} from '../entities';
import { ReactContentContext, type ReactContentContextValue } from './entities';

export type ContentProviderProps<T extends Variants = Variants> = Partial<
  ReactContentContextValue<T>
> & {
  children: ReactNode;
};

export function ContentProvider<T extends Variants = Variants>({
  children,
  ...props
}: ContentProviderProps<T>) {
  const { variants, prefixes } = props;
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

  return (
    <ReactContentContext.Provider value={contextValue}>
      {children}
    </ReactContentContext.Provider>
  );
}
