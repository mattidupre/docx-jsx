import { useMemo, type ReactElement } from 'react';
import type { ReactToDomOptions } from '../reactToDom.js';
import { EnvironmentProvider } from './EnvironmentProvider.js';
import { usePreview } from './usePreview.js';

type PreviewProps = ReactToDomOptions & {
  loading?: ReactElement;
  children: ReactElement;
};

export function Preview({ children, loading, ...options }: PreviewProps) {
  const memoizedChildren = useMemo(
    () => (
      <EnvironmentProvider options={{ target: 'pdf' }}>
        {children}
      </EnvironmentProvider>
    ),
    [children],
  );
  const { isLoading, previewElRef } = usePreview(memoizedChildren, options);
  return <div ref={previewElRef}>{isLoading && loading}</div>;
}
