import { createContext } from 'react';
import type { EnvironmentContext } from 'src/entities';

export const ReactEnvironmentContext = createContext<
  undefined | EnvironmentContext
>(undefined);
