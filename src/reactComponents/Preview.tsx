import {
  type ReactNode,
  memo,
  useRef,
  type ReactElement,
  type RefObject,
  type CSSProperties,
} from 'react';
import { usePreview, type UsePreviewOptions } from './usePreview';

/**
 * Keeps the identity of an array stable for as long as its members are stable,
 * so that callers may pass an array literal without restarting the preview on
 * every render.
 */
const useStableArray = <TValue,>(
  array: ReadonlyArray<TValue>,
): ReadonlyArray<TValue> => {
  const stableRef = useRef(array);
  const { current: stable } = stableRef;
  if (
    stable !== array &&
    (stable.length !== array.length ||
      stable.some((value, index) => value !== array[index]))
  ) {
    stableRef.current = array;
  }
  return stableRef.current;
};

type PreviewProps = UsePreviewOptions & {
  children: ReactElement | Array<ReactElement>;
  className?: string;
  style?: CSSProperties;
  Loading?: () => ReactNode;
  elRef?: RefObject<null | HTMLDivElement>;
};

export const Preview = memo(function Preview({
  className,
  style,
  initialStyleSheets: initialStyleSheetsProp = [],
  styleSheets: styleSheetsProp = [],
  Loading,
  children,
  elRef,
  ...props
}: PreviewProps) {
  const initialStyleSheets = useStableArray(initialStyleSheetsProp);

  const styleSheets = useStableArray(styleSheetsProp);

  const { isLoading, previewElRef } = usePreview(children, {
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
