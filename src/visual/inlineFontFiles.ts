import { type FontsConfig, getFontFaceFile } from '../entities';
import { readPublicFile } from '../lib/publicFiles';

/**
 * `fonts` with every face's file inlined as a `data:` URL.
 *
 * The PDF target is served `publicDirectory` by request interception, but the
 * HTML target is a page set from a string, which has no origin to fetch a
 * relative font file from: its text would silently fall back to the default
 * serif while its trimming and cap heights still used the font's metrics.
 * Inlining the bytes lets the same fonts config load in both.
 */
export const inlineFontFiles = async (
  fonts: FontsConfig,
  { publicDirectory }: { publicDirectory: string },
): Promise<FontsConfig> =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(fonts).map(async ([fontFamily, font]) => [
        fontFamily,
        {
          ...font,
          fontFaces: await Promise.all(
            font.fontFaces.map(async (fontFace) => {
              const src = getFontFaceFile(fontFace);
              if (src === undefined) {
                return fontFace;
              }
              const { data } = await readPublicFile(src, {
                publicDirectory,
                label: 'font file',
              });
              if (!data) {
                return fontFace;
              }
              return {
                ...fontFace,
                sources: [
                  {
                    documentType: 'web',
                    src: `data:font/ttf;base64,${Buffer.from(data).toString('base64')}`,
                    format: 'truetype',
                  },
                ],
              } satisfies typeof fontFace;
            }),
          ),
        },
      ]),
    ),
  );
