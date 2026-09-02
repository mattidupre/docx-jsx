import { useEffect } from 'react';
import type { StyleSheetsValue } from '../entities';

// TODO: Abstract into utils.
export const useInjectStyleSheets = (
  styleSheets: ReadonlyArray<undefined | StyleSheetsValue>,
) => {
  useEffect(() => {
    const cssStyleSheetsPromise = Promise.all(
      styleSheets.flatMap((styleSheet) => {
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
    });
    return () => {
      cssStyleSheetsPromise.then((cssStyleSheets) => {
        for (const cssStyleSheet of cssStyleSheets) {
          const index = document.adoptedStyleSheets.indexOf(cssStyleSheet);
          // A stylesheet already removed by someone else would otherwise
          // splice the last adopted stylesheet out of the document.
          if (index !== -1) {
            document.adoptedStyleSheets.splice(index, 1);
          }
        }
      });
    };
  }, [styleSheets]);
};
