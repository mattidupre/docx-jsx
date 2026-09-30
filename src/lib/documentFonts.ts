import { fromBuffer } from '@capsizecss/unpack';
import {
  type DocumentConfig,
  type FontFace,
  type FontMetrics,
  type FontsConfig,
  decodeElementData,
  getFontFaceFile,
  isElementOfType,
} from '../entities';
import { mapHtml } from '../utils/mapHtml/mapHtml';
import { readPublicFile } from './publicFiles';

/**
 * Font metrics for the targets that render in Node (DOCX, PDF, the HTML
 * document): each face's metrics are read once from its font file, before the
 * document is mapped, and travel on as plain data on the fonts config. Node
 * only, like `publicFiles`.
 */

const readFontFaceMetrics = async (
  fontFace: FontFace,
  { publicDirectory }: { publicDirectory?: string },
): Promise<undefined | FontMetrics> => {
  const src = getFontFaceFile(fontFace);
  if (src === undefined) {
    return undefined;
  }
  // A file that cannot be found is not an error yet: a document only needs
  // the metrics of the faces it sets `normal`, `capHeight` or trimmed text in,
  // and those report the missing metrics when they are resolved.
  const file = await readPublicFile(src, {
    publicDirectory,
    label: 'font file',
  });
  if (!file.data) {
    return undefined;
  }
  const { unitsPerEm, ascent, descent, lineGap, capHeight } = await fromBuffer(
    Buffer.from(file.data),
  ).catch((error: unknown) => {
    throw new Error(`Cannot read the metrics of the font file "${src}".`, {
      cause: error,
    });
  });
  return { unitsPerEm, ascent, descent, lineGap, capHeight };
};

/**
 * `fonts` with the metrics of every face that declares none read from its
 * font file, which is looked up as the PDF target looks it up.
 */
export const resolveFontMetrics = async (
  fonts: FontsConfig,
  { publicDirectory }: { publicDirectory?: string },
): Promise<FontsConfig> =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(fonts).map(async ([fontFamily, font]) => [
        fontFamily,
        {
          ...font,
          fontFaces: await Promise.all(
            font.fontFaces.map(async (fontFace): Promise<FontFace> => {
              if (fontFace.metrics) {
                return fontFace;
              }
              const metrics = await readFontFaceMetrics(fontFace, {
                publicDirectory,
              });
              return metrics ? { ...fontFace, metrics } : fontFace;
            }),
          ),
        },
      ]),
    ),
  );

/** The options of the document element in `html`, if it has one. */
const readDocumentConfig = (html: string): undefined | DocumentConfig => {
  let documentConfig: undefined | DocumentConfig = undefined;
  mapHtml<Record<string, never>, never>(html, {
    onElementBeforeChildren: ({ htmlElement }) => {
      const elementData = decodeElementData(htmlElement);
      if (!documentConfig && isElementOfType(elementData, 'document')) {
        documentConfig = elementData.elementOptions;
      }
      return {};
    },
    onText: () => [],
    onElementAfterChildren: () => [],
  });
  return documentConfig;
};

/**
 * The fonts a render of `html` uses, with their metrics: `fonts` when the
 * call gives them, else the fonts declared on the document. A call-level
 * config overrides the document's in every target, so passing the result on as
 * the call-level config changes nothing but the metrics.
 */
export const resolveDocumentFonts = async (
  html: string,
  { fonts, publicDirectory }: { fonts?: FontsConfig; publicDirectory?: string },
): Promise<undefined | FontsConfig> => {
  const documentFonts = fonts ?? readDocumentConfig(html)?.fonts;
  return (
    documentFonts && resolveFontMetrics(documentFonts, { publicDirectory })
  );
};
