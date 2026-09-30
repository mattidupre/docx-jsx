import {
  type RefObject,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  useCallback,
} from 'react';
import { reactToHtml } from '../lib/reactToHtml';
import {
  createPreviewController,
  type PreviewController,
  type PreviewRenderOptions,
} from '../parsers/dom/previewController';
import { InternalEnvironmentProvider } from './InternalEnvironmentProvider';

type PreviewHandle = {
  previewElRef: RefObject<null | HTMLDivElement>;
  isLoading: boolean;
};

export type UsePreviewOptions = PreviewRenderOptions & {
  autoscale?: boolean;
};

/**
 * React's binding of the framework-free preview controller (the one
 * `<matti-docs-preview>` wraps) to the element `previewElRef` is attached to.
 */
export const usePreview = (
  children: ReactElement | Array<ReactElement>,
  { initialStyleSheets, styleSheets, onDocument, autoscale }: UsePreviewOptions,
): PreviewHandle => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const previewElRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PreviewController>(undefined);

  const WrappedDocumentRoot = useCallback(() => {
    return (
      <InternalEnvironmentProvider documentType="pdf" isPreview>
        {children}
      </InternalEnvironmentProvider>
    );
  }, [children]);

  // Declared first so that it runs first: the effects below use the
  // controller. Clearing on unmount abandons a render in progress and takes
  // the pages and their stylesheets out of the document.
  useEffect(() => {
    const { current: previewEl } = previewElRef;
    if (!previewEl) {
      return;
    }
    const controller = createPreviewController(previewEl);
    controllerRef.current = controller;
    return () => {
      controller.clear();
      controllerRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    controllerRef.current
      ?.render(reactToHtml(WrappedDocumentRoot, 'pdf'), {
        initialStyleSheets,
        styleSheets,
        onDocument,
      })
      .then((isApplied) => {
        if (isApplied) {
          setIsLoading(false);
        }
      });
  }, [initialStyleSheets, styleSheets, onDocument, WrappedDocumentRoot]);

  useEffect(() => {
    controllerRef.current?.setAutoscale(Boolean(autoscale));
  }, [autoscale]);

  return {
    isLoading,
    previewElRef,
  };
};
