import { useContext } from 'react';
import { ReactEnvironmentContext } from './entities';
import { DEFAULT_TARGET } from 'src/entities';
import type { Target } from 'src/entities';

export const useTarget = (): Target =>
  useContext(ReactEnvironmentContext)?.target ?? DEFAULT_TARGET;
