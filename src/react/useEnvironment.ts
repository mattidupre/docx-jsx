import { useContext, useMemo } from 'react';
import {
  ReactEnvironmentContext,
  ReactDocumentContext,
  type ReactEnvironmentContextValue,
} from './entities.js';

type Environment = NonNullable<Required<ReactEnvironmentContextValue>>;

const DEFAULT_ENVIRONMENT: Environment = {
  documentType: 'web',
  isWebPreview: false,
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
    () => Object.assign({}, DEFAULT_ENVIRONMENT, environmentConfig),
    [environmentConfig],
  );
};
