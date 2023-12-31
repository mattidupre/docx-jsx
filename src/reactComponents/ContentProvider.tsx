import {
  useContext,
  type ReactNode,
  useMemo,
  useRef,
  createElement,
  type RefObject,
  type MutableRefObject,
} from 'react';
import { isEqual } from 'lodash';
import type { SetRequired } from 'type-fest';
import {
  type TagName,
  assignPrefixesOptions,
  assignVariants,
  type VariantsConfig,
} from '../entities';
import { createEnvironmentCss, variantsToCssVars } from '../lib/toCss';
import { ReactContentContext, type ReactContentContextValue } from './entities';
import { useEnvironment } from './useEnvironment';
import { useInjectStyleSheets } from './useInjectStyleSheets';

export type ContentProviderHandle<T extends VariantsConfig> = RefObject<{
  setVariants: (values: Partial<T> | { (prevVariants: T): Partial<T> }) => void;
}>;

export type ContentProviderProps<T extends VariantsConfig = VariantsConfig> =
  Partial<ReactContentContextValue<T>> & {
    injectEnvironmentCss?: boolean;
    children: ReactNode;
  } & (
      | { as?: undefined; handle?: undefined }
      | {
          as: TagName;
          handle?: ContentProviderHandle<T>;
        }
    );

// TODO: Add handle to context so it can be used from a hook.

function ContentProviderContainer<T extends VariantsConfig>({
  variants,
  prefixes,
  as,
  handle,
  children,
}: SetRequired<ContentProviderProps<T>, 'variants' | 'prefixes'>) {
  const elementRef = useRef<HTMLElement>();
  const prevVariantsRef = useRef((variants ?? {}) as Partial<T>);

  if (handle) {
    if (!handle.current) {
      (handle as MutableRefObject<unknown>).current = {};
    }

    handle.current!.setVariants = (variantsArgument) => {
      if (!elementRef.current) {
        throw new Error('Element not mounted');
      }

      if (!variants || !elementRef.current) {
        return;
      }

      // TODO: Error if newVariants does not match variants.

      const newVariants =
        typeof variantsArgument === 'function'
          ? variantsArgument(
              assignVariants<T>(variants, prevVariantsRef.current),
            )
          : variantsArgument ?? {};

      const newCssVars = variantsToCssVars({ prefixes }, newVariants);

      for (const prop in newCssVars)
        elementRef.current!.style.setProperty(
          prop,
          newCssVars[prop as keyof typeof newCssVars],
        );

      prevVariantsRef.current = newVariants;
    };
  }

  if (as) {
    return createElement(as, { ref: elementRef }, children);
  }

  return <>{children}</>;
}

export function ContentProvider<T extends VariantsConfig = VariantsConfig>({
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
        ? [createEnvironmentCss(contextValue)]
        : [],
    [contextValue, documentType, injectEnvironmentCss],
  );

  useInjectStyleSheets(environmentStyleSheets);

  return (
    <ReactContentContext.Provider value={contextValue}>
      <ContentProviderContainer<T>
        {...props}
        variants={contextValue.variants as T}
        prefixes={contextValue.prefixes}
      >
        {children}
      </ContentProviderContainer>
    </ReactContentContext.Provider>
  );
}
