import { type ReactNode, memo, useMemo, type ReactElement } from 'react';
import type { HtmlToDomOptions } from '../lib/htmlToDom.js';
import { usePreview } from './usePreview.js';

type DocumentPreviewProps = HtmlToDomOptions & {
  Loading?: () => ReactNode;
  DocumentRoot: () => ReactElement;
};

export const DocumentPreview = memo(function DocumentPreview({
  initialStyleSheets: initialStyleSheetsProp,
  styleSheets: styleSheetsProp,
  onDocument,
  Loading,
  DocumentRoot,
}: DocumentPreviewProps) {
  const initialStyleSheets = useMemo(
    () => initialStyleSheetsProp,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    initialStyleSheetsProp,
  );

  const styleSheets = useMemo(
    () => styleSheetsProp,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    styleSheetsProp,
  );

  const { isLoading, previewElRef } = usePreview(DocumentRoot, {
    initialStyleSheets,
    styleSheets,
    onDocument,
  });

  if (isLoading) {
    return Loading ? <Loading /> : null;
  }

  return <div ref={previewElRef} />;
});
