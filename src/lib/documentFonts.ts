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
 * Font files for the targets that render in Node (DOCX, PDF, the HTML
 * document): each face's file is read once, before the document is mapped.
 * Its metrics travel on as plain data on the fonts config, and its bytes are
 * kept for the DOCX, which embeds them. Node only, like `publicFiles`.
 */

/**
 * A document's fonts with every face's font file read: the faces carry the
 * metrics read from their files, and `fontFiles` holds each file's bytes by
 * face of `fonts`.
 */
export type ResolvedFonts = {
  fonts: FontsConfig;
  fontFiles: ReadonlyMap<FontFace, Uint8Array>;
};

const readFontFaceFile = async (
  fontFace: FontFace,
  { publicDirectory }: { publicDirectory?: string },
): Promise<undefined | { src: string; data: Uint8Array }> => {
  const src = getFontFaceFile(fontFace);
  if (src === undefined) {
    return undefined;
  }
  // A file that cannot be found is not an error yet: a document only needs
  // the metrics of the faces it sets `normal`, `capHeight` or trimmed text in,
  // and those report the missing metrics when they are resolved.
  const { data } = await readPublicFile(src, {
    publicDirectory,
    label: 'font file',
  });
  return data && { src, data };
};

const readFontMetrics = async (
  src: string,
  data: Uint8Array,
): Promise<FontMetrics> => {
  const { unitsPerEm, ascent, descent, lineGap, capHeight } = await fromBuffer(
    Buffer.from(data),
  ).catch((error: unknown) => {
    throw new Error(`Cannot read the metrics of the font file "${src}".`, {
      cause: error,
    });
  });
  return { unitsPerEm, ascent, descent, lineGap, capHeight };
};

/**
 * `fonts` with the font file of every face read, looked up as the PDF target
 * looks it up, and the metrics of every face that declares none read from it.
 */
export const resolveFontFiles = async (
  fonts: FontsConfig,
  { publicDirectory }: { publicDirectory?: string },
): Promise<ResolvedFonts> => {
  const fontFiles = new Map<FontFace, Uint8Array>();
  const resolveFontFace = async (fontFace: FontFace): Promise<FontFace> => {
    const file = await readFontFaceFile(fontFace, { publicDirectory });
    if (!file) {
      return fontFace;
    }
    const resolved = fontFace.metrics
      ? fontFace
      : { ...fontFace, metrics: await readFontMetrics(file.src, file.data) };
    fontFiles.set(resolved, file.data);
    return resolved;
  };
  const resolvedFonts: FontsConfig = Object.fromEntries(
    await Promise.all(
      Object.entries(fonts).map(async ([fontFamily, font]) => [
        fontFamily,
        {
          ...font,
          fontFaces: await Promise.all(font.fontFaces.map(resolveFontFace)),
        },
      ]),
    ),
  );
  return { fonts: resolvedFonts, fontFiles };
};

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
 * The fonts a render of `html` uses, with their font files read: `fonts` when
 * the call gives them, else the fonts declared on the document. A call-level
 * config overrides the document's in every target, so passing the resolved
 * fonts on as the call-level config changes nothing but the metrics.
 */
export const resolveDocumentFontFiles = async (
  html: string,
  { fonts, publicDirectory }: { fonts?: FontsConfig; publicDirectory?: string },
): Promise<undefined | ResolvedFonts> => {
  const documentFonts = fonts ?? readDocumentConfig(html)?.fonts;
  return documentFonts && resolveFontFiles(documentFonts, { publicDirectory });
};

/** The fonts a render of `html` uses, with their metrics. */
export const resolveDocumentFonts = async (
  html: string,
  options: { fonts?: FontsConfig; publicDirectory?: string },
): Promise<undefined | FontsConfig> =>
  (await resolveDocumentFontFiles(html, options))?.fonts;
