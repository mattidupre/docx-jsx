import { useMemo, type ReactNode, useContext } from 'react';
import {
  ReactEnvironmentContext,
  type ReactEnvironmentContextValue,
} from './entities.js';

type ExecutionProviderProps = ReactEnvironmentContextValue & {
  children: ReactNode;
};

const PROPERTIES = [
  'documentType',
  'isWebPreview',
] as const satisfies ReadonlyArray<
  keyof NonNullable<ReactEnvironmentContextValue>
>;

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
export function EnvironmentProvider({
  children,
  ...newContextValue
}: ExecutionProviderProps) {
  const prevContextValue = useContext(ReactEnvironmentContext);
  PROPERTIES.forEach((key) => {
    if (
      !compareDefinedProperties(prevContextValue ?? {}, newContextValue, key)
    ) {
      console.log(prevContextValue, newContextValue);
      throw new Error(`Do not override ${key}.`);
    }
  });

  const contextValue = useMemo(
    () => Object.assign({}, prevContextValue, newContextValue),
    [newContextValue, prevContextValue],
  );

  return (
    <ReactEnvironmentContext.Provider value={contextValue}>
      {children}
    </ReactEnvironmentContext.Provider>
  );
}
