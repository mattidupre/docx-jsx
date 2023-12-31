import { useContext } from 'react';
import { ReactContentContext } from './entities';

export const usePrefixes = () => {
  const contentContext = useContext(ReactContentContext);
  if (!contentContext) {
    throw new Error(
      'Cannot determine prefixes outside content or document provider',
    );
  }
  return contentContext.prefixes;
};
