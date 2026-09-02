import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { type PngPage, pngPageFileName } from './entities';

export type PageComparisonStatus =
  | 'match'
  | 'pixel-diff'
  | 'size-mismatch'
  | 'missing-actual'
  | 'missing-expected';

export type PageSize = { readonly width: number; readonly height: number };

export type PageComparison = {
  readonly page: number;
  readonly status: PageComparisonStatus;
  readonly mismatchRatio: number;
  readonly diffPixels: number;
  readonly totalPixels: number;
  readonly actual: undefined | PageSize;
  readonly expected: undefined | PageSize;
  readonly diffPath: undefined | string;
};

export type PageSetComparison = {
  readonly pageCountActual: number;
  readonly pageCountExpected: number;
  readonly pageCountMatches: boolean;
  readonly maxMismatchRatio: number;
  readonly meanMismatchRatio: number;
  readonly pages: ReadonlyArray<PageComparison>;
};

export type PixelComparisonOptions = {
  readonly threshold?: number;
  readonly includeAA?: boolean;
};

export type ComparePngPageOptions = PixelComparisonOptions & {
  readonly diffPath?: string;
};

export type ComparePngPageResult = {
  readonly diffPixels: number;
  readonly totalPixels: number;
  readonly mismatchRatio: number;
  readonly sizeMismatch: boolean;
  readonly actual: PageSize;
  readonly expected: PageSize;
  readonly diffPath: undefined | string;
};

/**
 * Pad two decoded PNGs onto a common canvas so pages of differing size still
 * produce a readable diff. The padding is opaque magenta: it can never be
 * mistaken for content and always registers as a difference.
 */
const padToCommonCanvas = (a: PNG, b: PNG) => {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const blit = (source: PNG): PNG => {
    if (source.width === width && source.height === height) {
      return source;
    }
    const padded = new PNG({ width, height });
    for (let offset = 0; offset < padded.data.length; offset += 4) {
      padded.data[offset] = 255;
      padded.data[offset + 1] = 0;
      padded.data[offset + 2] = 255;
      padded.data[offset + 3] = 255;
    }
    PNG.bitblt(source, padded, 0, 0, source.width, source.height, 0, 0);
    return padded;
  };
  return { width, height, a: blit(a), b: blit(b) };
};

/** Compare one actual page against one expected page. */
export const comparePngPage = async (
  actualBuffer: Buffer,
  expectedBuffer: Buffer,
  { threshold = 0.1, includeAA = false, diffPath }: ComparePngPageOptions = {},
): Promise<ComparePngPageResult> => {
  const actual = PNG.sync.read(actualBuffer);
  const expected = PNG.sync.read(expectedBuffer);
  const sizeMismatch =
    actual.width !== expected.width || actual.height !== expected.height;
  const { width, height, a, b } = padToCommonCanvas(expected, actual);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold,
    includeAA,
    alpha: 0.2,
    diffColor: [255, 0, 0],
  });
  const totalPixels = width * height;
  if (diffPath && diffPixels > 0) {
    await mkdir(dirname(diffPath), { recursive: true });
    await writeFile(diffPath, PNG.sync.write(diff));
  }
  return {
    diffPixels,
    totalPixels,
    mismatchRatio: diffPixels / totalPixels,
    sizeMismatch,
    actual: { width: actual.width, height: actual.height },
    expected: { width: expected.width, height: expected.height },
    diffPath: diffPixels > 0 ? diffPath : undefined,
  };
};

export type ComparePageSetsOptions = PixelComparisonOptions & {
  readonly diffDir?: string;
  readonly label?: string;
};

/**
 * Compare two page sets. Page-count and per-page size differences are reported
 * as their own statuses instead of being folded into the mismatch ratio: a
 * page-count change is the highest-value regression this system detects and
 * must never be absorbed by a tolerance.
 */
export const comparePageSets = async (
  actualPages: ReadonlyArray<PngPage>,
  expectedPages: ReadonlyArray<PngPage>,
  { diffDir, label = 'diff', ...pixelOptions }: ComparePageSetsOptions = {},
): Promise<PageSetComparison> => {
  const pageCount = Math.max(actualPages.length, expectedPages.length);
  const pages: Array<PageComparison> = [];
  for (let index = 0; index < pageCount; index += 1) {
    const actual = actualPages[index];
    const expected = expectedPages[index];
    const page = index + 1;
    if (!actual || !expected) {
      pages.push({
        page,
        status: actual ? 'missing-expected' : 'missing-actual',
        mismatchRatio: 1,
        diffPixels: 0,
        totalPixels: 0,
        actual: actual && { width: actual.width, height: actual.height },
        expected: expected && { width: expected.width, height: expected.height },
        diffPath: undefined,
      });
      continue;
    }
    const result = await comparePngPage(actual.buffer, expected.buffer, {
      ...pixelOptions,
      diffPath: diffDir
        ? join(diffDir, pngPageFileName(label, index))
        : undefined,
    });
    pages.push({
      page,
      status: result.sizeMismatch
        ? 'size-mismatch'
        : result.diffPixels === 0
          ? 'match'
          : 'pixel-diff',
      mismatchRatio: result.mismatchRatio,
      diffPixels: result.diffPixels,
      totalPixels: result.totalPixels,
      actual: result.actual,
      expected: result.expected,
      diffPath: result.diffPath,
    });
  }
  return {
    pageCountActual: actualPages.length,
    pageCountExpected: expectedPages.length,
    pageCountMatches: actualPages.length === expectedPages.length,
    maxMismatchRatio: pages.reduce(
      (max, page) => Math.max(max, page.mismatchRatio),
      0,
    ),
    meanMismatchRatio:
      pages.length === 0
        ? 0
        : pages.reduce((sum, page) => sum + page.mismatchRatio, 0) /
          pages.length,
    pages,
  };
};

export type TargetPages = {
  readonly name: string;
  readonly pages: ReadonlyArray<PngPage>;
};

/**
 * Cross-target ("reconciliation drift") comparison. Same machinery as
 * {@link comparePageSets}, but named for intent and defaulting to a loose
 * threshold: two different rasterisers never agree at the pixel level, so the
 * usable signals here are page count, page size and gross layout. Pixel
 * equality across targets is not achievable and must not be asserted.
 */
export const compareTargets = async (
  a: TargetPages,
  b: TargetPages,
  options: ComparePageSetsOptions = {},
): Promise<PageSetComparison> =>
  comparePageSets(a.pages, b.pages, {
    threshold: 0.2,
    label: `${a.name}-vs-${b.name}`,
    ...options,
  });
