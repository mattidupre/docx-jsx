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
  previewElRef: RefObject<HTMLDivElement>;
  isLoading: boolean;
};

export type UsePreviewOptions = ReactToDomOptions & {
  autoscale?: boolean;
};

export const usePreview = (
  DocumentRoot: () => ReactElement,
  { initialStyleSheets, styleSheets, onDocument, autoscale }: UsePreviewOptions,
): PreviewHandle => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const previewElRef = useRef<HTMLDivElement>(null);
  const documentElRef = useRef<HTMLElement>();
  const documentSizeRef = useRef<
    undefined | { width: number; height: number }
  >();
  const [documentElState, setDocumentElState] = useState<
    undefined | HTMLElement
  >(undefined);

  const WrappedDocumentRoot = useCallback(() => {
    return (
      <InternalEnvironmentProvider documentType="pdf" isPreview>
        <DocumentRoot />
      </InternalEnvironmentProvider>
    );
  }, [DocumentRoot]);

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

    previewEl.append(documentElState);

    documentElRef.current = documentElState;
    documentSizeRef.current = getElementOuterSize(documentElState);

    return () => {
      documentElState.remove();
      documentSizeRef.current = undefined;
    };
  }, [documentElState]);

  const observerRef = useRef<undefined | ResizeObserver>();
  useEffect(() => {
    const { current: previewEl } = previewElRef;
    if (!previewEl || !autoscale || observerRef.current) {
      return;
    }

    previewEl.style.setProperty('width', '100%');
    previewEl.style.setProperty('overflow', 'hidden');
    previewEl.style.setProperty('display', 'flex');
    previewEl.style.setProperty('justify-content', 'center');
    previewEl.style.setProperty('align-items', 'center');

    observerRef.current = new ResizeObserver((entries) => {
      if (!documentElRef.current) {
        return;
      }
      for (const entry of entries) {
        if (!entry.contentBoxSize) {
          continue;
        }

        const { width: previewWidth } = getElementInnerSize(previewEl);
        const { width: documentWidth, height: documentHeight } =
          documentSizeRef.current!;
        const scale = previewWidth / documentWidth;
        const overflowY = (1 - scale) * documentHeight;
        documentElRef.current.style.transformOrigin = 'top center';
        documentElRef.current.style.transform = `scale(${
          previewWidth / documentWidth
        })`;
        documentElRef.current.style.marginBottom = `-${overflowY}px`;
      }
    });

    observerRef.current.observe(previewEl);

    // Fire on every render since previewElRef must be attached outside this hook
    // and cannot be relied upon to be non-null on every render.
  });

  return {
    isLoading,
    previewElRef,
  };
};
