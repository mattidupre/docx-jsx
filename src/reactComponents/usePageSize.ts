import { useContext } from 'react';
import type { PageSize } from '../entities';
import { ReactDocumentContext } from './entities';

export const usePageSize = (): PageSize => {
  const documentContext = useContext(ReactDocumentContext);
  if (!documentContext) {
    throw new Error('Cannot determine page size outside document provider');
  }
  return documentContext.size;
};
