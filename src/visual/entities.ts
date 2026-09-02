import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

/**
 * One rasterised page.
 *
 * Every renderer in this module returns this exact shape. Sharing it is what
 * lets a single comparator serve both baseline comparison and cross-target
 * ("reconciliation drift") comparison.
 */
export type PngPage = {
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly buffer: Buffer;
};

/**
 * A binary artefact to rasterise. Tests pipe the bytes returned by
 * `reactToDocx` / `reactToPdf` straight in; scripts may point at a file.
 */
export type BinaryInput = Uint8Array | { readonly path: string };

export const readBinaryInput = async (
  input: BinaryInput,
): Promise<Uint8Array> =>
  input instanceof Uint8Array ? input : new Uint8Array(await readFile(input.path));

/**
 * An HTML document to rasterise, either as markup or as a file on disk.
 */
export type HtmlInput = string | { readonly path: string };

export const readHtmlInput = async (input: HtmlInput): Promise<string> =>
  typeof input === 'string' ? input : await readFile(input.path, 'utf-8');

/**
 * Every renderer standardises on 96 CSS pixels per inch with
 * `deviceScaleFactor: 1`, so a page's pixel size is a meaningful signal rather
 * than a units artefact.
 */
export const SCREEN_DPI = 96;

/**
 * US Letter (8.5in x 11in) at {@link SCREEN_DPI}. HTML, PDF and DOCX must all
 * land on exactly this size for the default `DocumentProvider` page.
 */
export const US_LETTER_PIXELS = { width: 816, height: 1056 } as const;

export const toPngPage = (buffer: Buffer, index: number): PngPage => {
  const { width, height } = PNG.sync.read(buffer);
  return { index, width, height, buffer };
};

export const readPngPage = async (
  path: string,
  index: number,
): Promise<PngPage> => toPngPage(await readFile(path), index);

/** `<name>-page-01.png`; zero padded so a plain sort is a page-order sort. */
export const pngPageFileName = (name: string, index: number): string =>
  `${name}-page-${String(index + 1).padStart(2, '0')}.png`;

/**
 * Fail loudly instead of hanging.
 *
 * A wedged Chrome page (a stalled paginator, a screenshot of a tab that never
 * paints) otherwise surfaces as a vitest hook timeout that names no renderer
 * and no document, which is close to useless when several fixtures run in one
 * hook. The losing promise is left to settle on its own; the renderers close
 * their page in a `finally` block regardless.
 */
export const withTimeout = async <TResult>(
  operation: string,
  timeout: number,
  run: () => Promise<TResult>,
): Promise<TResult> => {
  let timer: undefined | ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${operation} did not finish within ${timeout}ms.`));
        }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
