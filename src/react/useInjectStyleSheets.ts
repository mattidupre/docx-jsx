import { useEffect } from 'react';
import type { StyleSheetsValue } from 'src/entities';

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
          document.adoptedStyleSheets.splice(
            document.adoptedStyleSheets.indexOf(cssStyleSheet),
            1,
          );
        }
      });
    };
  }, [styleSheets]);
};
