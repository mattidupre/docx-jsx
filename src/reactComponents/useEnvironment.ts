import { useContext, useMemo } from 'react';
import type { Simplify } from 'type-fest';
import { extendDefined } from '../utils/object';
import {
  ReactEnvironmentContext,
  ReactDocumentContext,
  type ReactEnvironmentContextValue,
} from './entities';

type Environment = Required<ReactEnvironmentContextValue>;

const DEFAULT_ENVIRONMENT = {
  documentType: 'web',
  isPreview: false,
} as const satisfies Environment;

type UseEnvironmentOptions = {
  disableAssert?: boolean;
};

/**
 * Returns information about the document's execution environment.
 *
 * By default it also asserts that the caller is inside a `DocumentProvider`,
 * which is the contract for library consumers: the hook is exported, and
 * outside a document there is no page to describe. Library components pass
 * `disableAssert` because they must also render under a bare
 * `ContentProvider`, which supplies variants and prefixes but no document.
 */
export const useEnvironment = ({
  disableAssert = false,
}: UseEnvironmentOptions = {}): Simplify<ReactEnvironmentContextValue> => {
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
