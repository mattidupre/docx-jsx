import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Reading the files a document refers to (images, font files) in Node, where
 * the browser targets would fetch them. Node only: nothing the browser bundle
 * imports may import this.
 */

const DATA_URL_EXP = /^data:([^;,]*)(;base64)?,([\S\s]*)$/;

const decodeDataUrl = (src: string, label: string): undefined | Uint8Array => {
  const [, , base64, payload] = DATA_URL_EXP.exec(src) ?? [];
  if (payload === undefined) {
    return undefined;
  }
  if (!base64) {
    throw new TypeError(
      `The ${label} "${src.slice(0, 32)}…" is a data URL that is not base64 encoded.`,
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

export type PublicFile =
  { data: Uint8Array } | { data: undefined; attempted: ReadonlyArray<string> };

/**
 * Where the browser would have fetched `src` from, read from disk instead: a
 * `data:` URL, the file under `publicDirectory` (tried first, so the same
 * `src` resolves to the same file as the PDF target's request interception),
 * or an absolute path. When nothing matches, the paths that were tried.
 *
 * `label` names the file in the error a malformed data URL throws.
 */
export const readPublicFile = async (
  src: string,
  { publicDirectory, label }: { publicDirectory?: string; label: string },
): Promise<PublicFile> => {
  const dataUrlBytes = decodeDataUrl(src, label);
  if (dataUrlBytes) {
    return { data: dataUrlBytes };
  }

  const attempted: Array<string> = [];

  if (publicDirectory !== undefined) {
    const publicPath = path.join(publicDirectory, src);
    attempted.push(publicPath);
    const data = await readFileIfExists(publicPath);
    if (data) {
      return { data };
    }
  }

  if (path.isAbsolute(src)) {
    attempted.push(src);
    const data = await readFileIfExists(src);
    if (data) {
      return { data };
    }
  }

  return { data: undefined, attempted };
};
