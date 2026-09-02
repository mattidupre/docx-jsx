import path from 'node:path';
import fs from 'node:fs/promises';
import { decodeElementData, isElementOfType } from '../../entities';
import { mapHtml } from '../../utils/mapHtml/mapHtml';

/**
 * The raster formats `docx` can write into `word/media`. An SVG needs a
 * `fallback` bitmap of its own and reaches Word through the `svgImages` option
 * instead, so it is deliberately absent here.
 */
export type DocumentImageType = 'png' | 'jpg' | 'gif' | 'bmp';

export type DocumentImage = {
  readonly type: DocumentImageType;
  readonly data: Uint8Array;
  /**
   * The size written in the file's own header, in pixels. It is only needed
   * when one of `width`/`height` was left off the component, and a format whose
   * header could not be read leaves it undefined.
   */
  readonly intrinsicWidth: undefined | number;
  readonly intrinsicHeight: undefined | number;
};

const DATA_URL_EXP = /^data:([^;,]*)(;base64)?,([\S\s]*)$/;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const GIF_SIGNATURE = [0x47, 0x49, 0x46, 0x38];

const BMP_SIGNATURE = [0x42, 0x4d];

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

const startsWithBytes = (
  data: Uint8Array,
  signature: ReadonlyArray<number>,
): boolean =>
  data.length >= signature.length &&
  signature.every((byte, index) => data[index] === byte);

const toDataView = (data: Uint8Array) =>
  new DataView(data.buffer, data.byteOffset, data.byteLength);

const readPngSize = (data: Uint8Array) => {
  // 8 signature bytes, then the IHDR chunk's length and type, then the size.
  if (data.length < 24) {
    return undefined;
  }
  const view = toDataView(data);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const readGifSize = (data: Uint8Array) => {
  if (data.length < 10) {
    return undefined;
  }
  const view = toDataView(data);
  return {
    width: view.getUint16(6, true),
    height: view.getUint16(8, true),
  };
};

const readBmpSize = (data: Uint8Array) => {
  if (data.length < 26) {
    return undefined;
  }
  const view = toDataView(data);
  // A bottom-up BMP writes its height as a negative number.
  return {
    width: Math.abs(view.getInt32(18, true)),
    height: Math.abs(view.getInt32(22, true)),
  };
};

/** Frame markers that are not a start-of-frame despite sitting in its range. */
const JPEG_NON_FRAME_MARKERS = [0xc4, 0xc8, 0xcc];

const readJpegSize = (data: Uint8Array) => {
  const view = toDataView(data);
  let offset = 2;
  while (offset + 3 < data.length) {
    if (view.getUint8(offset) !== 0xff) {
      return undefined;
    }
    const marker = view.getUint8(offset + 1);
    // Padding, restart markers and the standalone start/end of image carry no
    // length of their own.
    if (
      marker === 0xff ||
      (marker >= 0xd0 && marker <= 0xd9) ||
      marker === 0x01
    ) {
      offset += marker === 0xff ? 1 : 2;
      continue;
    }
    const segmentLength = view.getUint16(offset + 2);
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      !JPEG_NON_FRAME_MARKERS.includes(marker)
    ) {
      if (offset + 9 > data.length) {
        return undefined;
      }
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }
    offset += 2 + segmentLength;
  }
  return undefined;
};

/**
 * The format and the intrinsic size, read from the bytes rather than from the
 * file extension: a `.png` holding a JPEG makes a DOCX Word refuses to open.
 */
const readImageHeader = (
  src: string,
  data: Uint8Array,
): Omit<DocumentImage, 'data'> => {
  const toHeader = (
    type: DocumentImageType,
    size: undefined | { width: number; height: number },
  ) => ({
    type,
    intrinsicWidth: size?.width,
    intrinsicHeight: size?.height,
  });

  if (startsWithBytes(data, PNG_SIGNATURE)) {
    return toHeader('png', readPngSize(data));
  }
  if (startsWithBytes(data, JPEG_SIGNATURE)) {
    return toHeader('jpg', readJpegSize(data));
  }
  if (startsWithBytes(data, GIF_SIGNATURE)) {
    return toHeader('gif', readGifSize(data));
  }
  if (startsWithBytes(data, BMP_SIGNATURE)) {
    return toHeader('bmp', readBmpSize(data));
  }
  throw new TypeError(
    `The image "${src}" is not a PNG, JPEG, GIF or BMP; Word cannot draw any other format.`,
  );
};

const decodeDataUrl = (src: string): undefined | Uint8Array => {
  const [, , base64, payload] = DATA_URL_EXP.exec(src) ?? [];
  if (payload === undefined) {
    return undefined;
  }
  if (!base64) {
    throw new TypeError(
      `The image "${src.slice(0, 32)}…" is a data URL that is not base64 encoded.`,
    );
  }
  return new Uint8Array(Buffer.from(payload, 'base64'));
};

const readFileIfExists = async (
  filePath: string,
): Promise<undefined | Uint8Array> => {
  try {
    return new Uint8Array(await fs.readFile(filePath));
  } catch {
    return undefined;
  }
};

/**
 * Where the browser would have fetched `src` from, read from disk instead.
 * `publicDirectory` is tried first so that the same `src` resolves to the same
 * file as the PDF target's request interception, and an absolute path is only
 * used when nothing under the public directory matches.
 */
const readImageData = async (
  src: string,
  { publicDirectory }: { publicDirectory?: string },
): Promise<Uint8Array> => {
  const dataUrlBytes = decodeDataUrl(src);
  if (dataUrlBytes) {
    return dataUrlBytes;
  }

  const attempted: Array<string> = [];

  if (publicDirectory !== undefined) {
    const publicPath = path.join(publicDirectory, src);
    attempted.push(publicPath);
    const data = await readFileIfExists(publicPath);
    if (data) {
      return data;
    }
  }

  if (path.isAbsolute(src)) {
    attempted.push(src);
    const data = await readFileIfExists(src);
    if (data) {
      return data;
    }
  }

  throw new Error(
    `Cannot read the image "${src}" for the DOCX target. ${
      attempted.length > 0
        ? `Looked in ${attempted.join(', ')}.`
        : 'Pass a "publicDirectory" to reactToDocx, an absolute path, or a data URL.'
    }`,
  );
};

/**
 * Every `src` an `Image` element in `html` refers to. `mapHtmlToDocument` is
 * synchronous and reading a file is not, so the bytes are collected up front
 * and the mapping only looks them up.
 */
const collectImageSources = (html: string): ReadonlyArray<string> => {
  const sources = new Set<string>();
  mapHtml<Record<string, never>, never>(html, {
    onElementBeforeChildren: ({ htmlElement }) => {
      const elementData = decodeElementData(htmlElement);
      if (isElementOfType(elementData, 'image')) {
        sources.add(elementData.elementOptions.src);
      }
      return {};
    },
    onText: () => [],
    onElementAfterChildren: () => [],
  });
  return [...sources];
};

export const resolveDocumentImages = async (
  html: string,
  { publicDirectory }: { publicDirectory?: string },
): Promise<ReadonlyMap<string, DocumentImage>> => {
  const entries = await Promise.all(
    collectImageSources(html).map(async (src) => {
      const data = await readImageData(src, { publicDirectory });
      return [src, { ...readImageHeader(src, data), data }] as const;
    }),
  );
  return new Map(entries);
};
