import { useContext } from 'react';
import { DEFAULT_TARGET } from '../entities';
import type { Target } from '../entities';
import { ReactEnvironmentContext } from './entities.js';

/**
 * Defaults to web.
 */
export const useTarget = (): Target =>
  useContext(ReactEnvironmentContext)?.target ?? DEFAULT_TARGET;
