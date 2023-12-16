import { useMemo, type ReactNode, useContext } from 'react';
import { assignEnvironmentContext } from '../entities';
import type { EnvironmentContextOptions } from '../entities';
import { ReactEnvironmentContext } from './entities.js';

type ExecutionProviderProps = {
  options: EnvironmentContextOptions;
  children: ReactNode;
};

/**
 * For internal use only.
 */
export function EnvironmentProvider({
  options,
  children,
}: ExecutionProviderProps) {
  console.log(useContext(ReactEnvironmentContext));

  if (useContext(ReactEnvironmentContext)) {
    throw new TypeError('Do not nest EnvironmentProvider elements.');
  }
  const value = useMemo(() => assignEnvironmentContext(options), [options]);
  return (
    <ReactEnvironmentContext.Provider value={value}>
      {children}
    </ReactEnvironmentContext.Provider>
  );
}
