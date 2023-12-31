import { useMemo, type ReactNode, useContext } from 'react';
import { extendDefined } from '../utils/object';
import {
  ReactEnvironmentContext,
  type ReactEnvironmentContextValue,
} from './entities';

type ExecutionProviderProps = ReactEnvironmentContextValue & {
  children: ReactNode;
};

const PROPERTIES = [
  'documentType',
  'isPreview',
] as const satisfies ReadonlyArray<keyof ReactEnvironmentContextValue>;

const compareDefinedProperties = <T extends Record<string, unknown>>(
  valueA: T,
  valueB: T,
  key: keyof T,
): boolean =>
  valueA[key] === undefined ||
  valueB[key] === undefined ||
  valueA[key] === valueB[key];

/**
 * For internal use only. Parent contexts will completely overwrite child
 * contexts.
 */
export function InternalEnvironmentProvider({
  children,
  documentType,
  isPreview,
}: ExecutionProviderProps) {
  const prevContextValue = useContext(ReactEnvironmentContext);

  const newContextValue = useMemo(
    () =>
      extendDefined(prevContextValue ?? ({} as ReactEnvironmentContextValue), {
        documentType,
        isPreview,
      }),
    [documentType, isPreview, prevContextValue],
  );

  PROPERTIES.forEach((key) => {
    if (
      !compareDefinedProperties(
        prevContextValue ?? ({} as ReactEnvironmentContextValue),
        newContextValue,
        key,
      )
    ) {
      throw new Error(`Do not override ${key}.`);
    }
  });

  return (
    <ReactEnvironmentContext.Provider value={newContextValue}>
      {children}
    </ReactEnvironmentContext.Provider>
  );
}
