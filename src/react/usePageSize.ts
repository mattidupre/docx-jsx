import { useContext } from 'react';
import type { PageSize } from '../entities';
import { ReactDocumentContext } from './entities';

export const usePageSize = (): PageSize => {
  const documentConfig = useContext(ReactDocumentContext);
  if (!documentConfig) {
    throw new Error('Cannot determine page size outside document.');
  }
  return documentConfig.size;
};
