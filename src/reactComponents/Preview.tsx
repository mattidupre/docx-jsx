import { type ReactNode, memo, type ReactElement } from 'react';
import type { HtmlToDomOptions } from '../lib/dom';
import type { ReactToDomOptions } from '../reactToDom';
import { usePreview } from './usePreview';

type PreviewProps = HtmlToDomOptions & {
  isLoading?: boolean;
  Loading?: () => ReactNode;
  DocumentRoot: () => ReactElement;
};

export const Preview = memo(function Preview({
  shadow,
  onDocument,
  isLoading: isLoadingProp,
  Loading,
  DocumentRoot,
}: PreviewProps) {
  // const initialStyleSheets = useMemo(
  //   () => initialStyleSheetsProp,
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   initialStyleSheetsProp,
  // );

  // const styleSheets = useMemo(
  //   () => styleSheetsProp,
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   styleSheetsProp,
  // );

  const { isLoading, previewElRef } = usePreview(DocumentRoot, {
    shadow,
    // initialStyleSheets,
    // styleSheets,
    onDocument,
    isDisabled: isLoadingProp,
  } as ReactToDomOptions);

  if (isLoading || isLoadingProp) {
    return Loading ? <Loading /> : null;
  }

  return <div ref={previewElRef} />;
});
