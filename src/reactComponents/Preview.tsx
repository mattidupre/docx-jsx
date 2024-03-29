import {
  type ReactNode,
  memo,
  useMemo,
  type ReactElement,
  type RefObject,
  type CSSProperties,
} from 'react';
import { usePreview, type UsePreviewOptions } from './usePreview';

type PreviewProps = UsePreviewOptions & {
  className?: string;
  style?: CSSProperties;
  Loading?: () => ReactNode;
  DocumentRoot: () => ReactElement;
  elRef?: RefObject<null | HTMLDivElement>;
};

export const Preview = memo(function Preview({
  className,
  style,
  initialStyleSheets: initialStyleSheetsProp,
  styleSheets: styleSheetsProp,
  Loading,
  DocumentRoot,
  elRef,
  ...props
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
    ...props,
  });

  return (
    <div
      className={className}
      style={style}
      ref={(el) => {
        (previewElRef.current as typeof el) = el;
        if (elRef) {
          (elRef.current as typeof el) = el;
        }
      }}
    >
      {isLoading && Loading && <Loading />}
    </div>
  );
});
