import { useEffect, useMemo, useRef, useState } from 'react';
import type { StyleSheetsValue } from '../entities';

// TODO: Abstract into utils.
export const useInjectStyleSheets = (
  styleSheets: ReadonlyArray<undefined | StyleSheetsValue>,
) => {
  const [isStyleSheetsLoaded, setIsStyleSheetsLoaded] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styleSheetsMemoized = useMemo(() => [...styleSheets], styleSheets);

  useEffect(() => {
    const cssStyleSheetsPromise = Promise.all(
      styleSheetsMemoized.flatMap((styleSheet) => {
        if (styleSheet instanceof CSSStyleSheet) {
          return styleSheet;
        }
        if (typeof styleSheet === 'string') {
          const cssStyleSheet = new CSSStyleSheet();
          return cssStyleSheet.replace(styleSheet);
        }
        if (styleSheet === undefined) {
          return [];
        }
        throw new TypeError('Invalid stylesheet.');
      }),
    );
    cssStyleSheetsPromise.then((cssStyleSheets) => {
      document.adoptedStyleSheets.push(...cssStyleSheets);
      setIsStyleSheetsLoaded(true);
    });
    return () => {
      cssStyleSheetsPromise.then((cssStyleSheets) => {
        for (const cssStyleSheet of cssStyleSheets) {
          document.adoptedStyleSheets.splice(
            document.adoptedStyleSheets.indexOf(cssStyleSheet),
            1,
          );
        }
      });
    };
  }, [styleSheetsMemoized]);

  return { isStyleSheetsLoaded };
};
