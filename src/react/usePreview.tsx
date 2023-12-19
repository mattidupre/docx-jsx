import {
  type RefObject,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { reactToDom, type ReactToDomOptions } from '../reactToDom';
import { EnvironmentProvider } from './EnvironmentProvider.js';

type PreviewHandle = {
  previewElRef: RefObject<HTMLDivElement>;
  isLoading: boolean;
};

export const usePreview = (
  createReactEl: () => ReactElement,
  { styleSheets = [], ...options }: ReactToDomOptions,
): PreviewHandle => {
  const previewElRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const reactEl = useMemo(() => createReactEl(), [createReactEl]);

  useEffect(
    () => {
      if (!previewElRef.current) {
        console.warn('Preview ref is not attached to DOM.');
        return;
      }

      // Indicate that the preview element is still being built.
      setIsLoading(true);

      // Only attach to DOM if this useEffect is still active. If the component
      // has been unmounted or if a new resume prop has been provided, interrupt
      // the operation before the preview is attached to the DOM.
      let isInterrupted = false;

      // Retain a scoped reference to the inside element so it can be removed.
      let thisResumeEl: HTMLElement;

      // reactToPreview is a React-less async operation resolving to a detached
      // element.
      reactToDom(
        <EnvironmentProvider documentType="pdf" isWebPreview>
          {reactEl}
        </EnvironmentProvider>,
        {
          ...options,
          styleSheets,
        },
      ).then((resumeEl) => {
        if (isInterrupted) {
          return;
        }
        setIsLoading(false);
        thisResumeEl = resumeEl;
        previewElRef.current!.append(resumeEl);
      });

      return () => {
        isInterrupted = true;
        if (thisResumeEl) {
          thisResumeEl.remove();
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createReactEl, styleSheets],
  );

  return useMemo(
    () => ({
      isLoading,
      previewElRef,
    }),
    [isLoading, previewElRef],
  );
};
