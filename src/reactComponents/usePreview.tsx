import {
  type RefObject,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactElement,
  useCallback,
} from 'react';
import { reactToDom, type ReactToDomOptions } from '../reactToDom';
import { InternalEnvironmentProvider } from './InternalEnvironmentProvider';

type PreviewHandle = {
  previewElRef: RefObject<HTMLDivElement>;
  isLoading: boolean;
};

export const usePreview = (
  DocumentRoot: () => ReactElement,
  {
    shadow,
    initialStyleSheets,
    styleSheets,
    onDocument,
    isDisabled,
  }: ReactToDomOptions & { isDisabled?: boolean },
): PreviewHandle => {
  const previewElRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resumeEl, setResumeEl] = useState<undefined | HTMLElement>(undefined);

  const WrappedDocumentRoot = useCallback(() => {
    return (
      <InternalEnvironmentProvider documentType="pdf" isPreview>
        <DocumentRoot />
      </InternalEnvironmentProvider>
    );
  }, [DocumentRoot]);

  useEffect(() => {
    // Allow deferring of render operation, for instance when loading CSS.
    if (isDisabled) {
      return;
    }

    console.log('executing');

    // Only attach to DOM if this useEffect is still active. If the component
    // has been unmounted or if a new resume prop has been provided, interrupt
    // the operation before the preview is attached to the DOM.
    let isInterrupted = false;

    // Retain a scoped reference to the inside element so it can be removed.
    let thisResumeEl: HTMLElement;

    // reactToPreview is a React-less async operation resolving to a detached
    // element.
    reactToDom(WrappedDocumentRoot, {
      shadow,
      initialStyleSheets,
      styleSheets,
      onDocument,
    } as ReactToDomOptions).then((resumeEl) => {
      if (isInterrupted) {
        return;
      }
      setIsLoading(false);
      setResumeEl(resumeEl);
      thisResumeEl = resumeEl;
    });

    return () => {
      isInterrupted = true;
      if (thisResumeEl) {
        thisResumeEl.remove();
      }
    };
  }, [
    initialStyleSheets,
    styleSheets,
    onDocument,
    WrappedDocumentRoot,
    shadow,
    isDisabled,
  ]);

  useEffect(() => {
    if (resumeEl && previewElRef.current) {
      previewElRef.current.append(resumeEl);
    }
  }, [resumeEl]);

  return useMemo(
    () => ({
      isLoading,
      previewElRef,
    }),
    [isLoading, previewElRef],
  );
};
