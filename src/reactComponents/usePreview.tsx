import {
  type RefObject,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  useCallback,
} from 'react';
import { reactToDom, type ReactToDomOptions } from '../reactToDom';
import { getElementInnerSize, getElementOuterSize } from '../utils/elements';
import { InternalEnvironmentProvider } from './InternalEnvironmentProvider';

type PreviewHandle = {
  previewElRef: RefObject<null | HTMLDivElement>;
  isLoading: boolean;
};

export type UsePreviewOptions = ReactToDomOptions & {
  autoscale?: boolean;
};

export const usePreview = (
  children: ReactElement | Array<ReactElement>,
  { initialStyleSheets, styleSheets, onDocument, autoscale }: UsePreviewOptions,
): PreviewHandle => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const previewElRef = useRef<HTMLDivElement>(null);
  const documentElRef = useRef<HTMLElement>(undefined);
  const documentSizeRef = useRef<
    undefined | { width: number; height: number }
  >(undefined);
  const [documentElState, setDocumentElState] = useState<
    undefined | HTMLElement
  >(undefined);

  const WrappedDocumentRoot = useCallback(() => {
    return (
      <InternalEnvironmentProvider documentType="pdf" isPreview>
        {children}
      </InternalEnvironmentProvider>
    );
  }, [children]);

  useEffect(() => {
    // Only attach to DOM if this useEffect is still active. If the component
    // has been unmounted or if a new resume prop has been provided, interrupt
    // the operation before the preview is attached to the DOM.
    let isInterrupted = false;

    // reactToPreview is a React-less async operation resolving to a detached
    // element.
    reactToDom(WrappedDocumentRoot, {
      initialStyleSheets,
      styleSheets,
      onDocument,
    }).then((resumeEl) => {
      if (isInterrupted) {
        return;
      }
      setIsLoading(false);
      setDocumentElState(resumeEl);
    });

    return () => {
      isInterrupted = true;
    };
  }, [initialStyleSheets, styleSheets, onDocument, WrappedDocumentRoot]);

  useEffect(() => {
    const { current: previewEl } = previewElRef;
    if (!previewEl || !documentElState) {
      return;
    }

    documentElRef.current?.remove();
    previewEl.append(documentElState);
    documentElRef.current = documentElState;

    documentSizeRef.current = getElementOuterSize(documentElState);

    return () => {
      if (!documentElState.isConnected) {
        documentElState.remove();
      }
      documentSizeRef.current = undefined;
    };
  }, [documentElState]);

  // `documentElState` is a dependency because the effect above attaches the
  // document element and measures it; re-running here observes the preview
  // element against the size of the document currently attached to it.
  useEffect(() => {
    const { current: previewEl } = previewElRef;
    if (!previewEl || !autoscale) {
      return;
    }

    previewEl.style.setProperty('width', '100%');
    previewEl.style.setProperty('display', 'flex');
    previewEl.style.setProperty('justify-content', 'center');
    previewEl.style.setProperty('align-items', 'center');

    const observer = new ResizeObserver((entries) => {
      const { current: documentEl } = documentElRef;
      const { current: documentSize } = documentSizeRef;
      const previewSize = getElementInnerSize(previewEl);
      if (!documentEl || !documentSize || !previewSize) {
        return;
      }
      for (const entry of entries) {
        if (!entry.contentBoxSize) {
          continue;
        }

        const { width: previewWidth } = previewSize;
        const { width: documentWidth, height: documentHeight } = documentSize;
        const scale = previewWidth / documentWidth;
        const overflowY = (1 - scale) * documentHeight;
        documentEl.style.transformOrigin = 'top center';
        documentEl.style.transform = `scale(${scale})`;
        documentEl.style.marginBottom = `-${overflowY}px`;
      }
    });

    observer.observe(previewEl);

    return () => {
      observer.disconnect();
    };
  }, [autoscale, documentElState]);

  return {
    isLoading,
    previewElRef,
  };
};
