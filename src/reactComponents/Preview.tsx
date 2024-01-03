import { type ReactNode, memo, useMemo, type ReactElement } from 'react';
import type { HtmlToDomOptions } from '../lib/htmlToDom';
import { usePreview } from './usePreview';

type PreviewProps = HtmlToDomOptions & {
  Loading?: () => ReactNode;
  DocumentRoot: () => ReactElement;
};

export const Preview = memo(function PReview({
  initialStyleSheets: initialStyleSheetsProp,
  styleSheets: styleSheetsProp,
  onDocument,
  Loading,
  DocumentRoot,
}: PreviewProps) {
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
