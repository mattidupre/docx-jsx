import { useContext, useMemo } from 'react';
import { extendDefined } from '../utils/object';
import {
  ReactEnvironmentContext,
  ReactDocumentContext,
  type ReactEnvironmentContextValue,
} from './entities';

type Environment = NonNullable<Required<ReactEnvironmentContextValue>>;

const DEFAULT_ENVIRONMENT: Environment = {
  documentType: 'web',
  isPreview: false,
};

type UseEnvironmentOptions = {
  disableAssert?: boolean;
};

/**
 * Returns information about the document's execution environment. Also useful
 * to element is a child of DocumentProvider.
 */
export const useEnvironment = ({
  disableAssert = false,
}: UseEnvironmentOptions = {}): Environment => {
  const documentConfig = useContext(ReactDocumentContext);
  if (!documentConfig && !disableAssert) {
    throw new Error('Document Context not found.');
  }
  const environmentConfig = useContext(ReactEnvironmentContext);

  return useMemo(
    () => extendDefined<Environment>(DEFAULT_ENVIRONMENT, environmentConfig),
    [environmentConfig],
  );
};
