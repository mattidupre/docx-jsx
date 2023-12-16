import { useContext } from 'react';
import type { PageMargin } from '../entities';
import { ReactStackContext } from './entities';

export const usePageMargins = (): PageMargin => {
  const stackConfig = useContext(ReactStackContext);
  if (!stackConfig) {
    throw new Error('Cannot determine page margins outside stack.');
  }
  return structuredClone(stackConfig.margin);
};
