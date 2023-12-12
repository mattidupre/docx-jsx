import type { ReactElement } from 'react';
import type { ReactToDomOptions } from '../reactToDom.js';
import { usePreview } from './usePreview.js';

type PreviewProps = ReactToDomOptions & {
  loading?: ReactElement;
  children: ReactElement;
};

export function Preview({ children, loading, ...options }: PreviewProps) {
  const { isLoading, previewElRef } = usePreview(children, options);
  return <div ref={previewElRef}>{isLoading && loading}</div>;
}
