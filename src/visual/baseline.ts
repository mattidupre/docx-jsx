import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type PngPage,
  pngPageFileName,
  readPngPage,
} from './entities';
import { comparePageSets, type PageSetComparison } from './compare';

const DIFF_DIRECTORY_NAME = '__diff_output__';

/**
 * Pixel budget for a baseline comparison. All four renderers were measured as
 * byte-identical across repeated runs on this machine, so this is pure headroom
 * for font-cache differences between machines rather than measured jitter.
 */
const DEFAULT_MAX_MISMATCH_RATIO = 0.002;

export type BaselineResult = {
  readonly pass: boolean;
  readonly written: boolean;
  readonly reason: string;
  readonly result: undefined | PageSetComparison;
};

export type CompareWithBaselineOptions = {
  readonly snapshotDir: string;
  readonly diffDir?: string;
  readonly update?: boolean;
  readonly ci?: boolean;
  readonly threshold?: number;
  readonly maxMismatchRatio?: number;
};

const baselineFilesOf = async (
  snapshotDir: string,
  name: string,
): Promise<ReadonlyArray<string>> => {
  let entries: ReadonlyArray<string>;
  try {
    entries = await readdir(snapshotDir);
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.startsWith(`${name}-page-`) && entry.endsWith('.png'))
    .sort();
};

const readBaseline = async (
  snapshotDir: string,
  name: string,
): Promise<undefined | ReadonlyArray<PngPage>> => {
  const files = await baselineFilesOf(snapshotDir, name);
  if (files.length === 0) {
    return undefined;
  }
  return await Promise.all(
    files.map((file, index) => readPngPage(join(snapshotDir, file), index)),
  );
};

/**
 * Stale pages are removed before the new set is written, so a document that
 * loses a page cannot leave an orphan baseline behind that silently passes.
 */
const writeBaseline = async (
  snapshotDir: string,
  name: string,
  pages: ReadonlyArray<PngPage>,
): Promise<void> => {
  await mkdir(snapshotDir, { recursive: true });
  for (const file of await baselineFilesOf(snapshotDir, name)) {
    await rm(join(snapshotDir, file));
  }
  await Promise.all(
    pages.map((page, index) =>
      writeFile(join(snapshotDir, pngPageFileName(name, index)), page.buffer),
    ),
  );
};

/**
 * Compare rendered pages with the committed baseline for `name`.
 *
 * Returns a structured result rather than throwing, so the caller can name the
 * page, the ratio and the diff file in its own failure message. `written: true`
 * means a baseline was created or refreshed; a fresh baseline must never read
 * as a pass in CI, which is why a missing baseline under `ci` fails instead of
 * being written.
 */
export const compareWithBaseline = async (
  name: string,
  pages: ReadonlyArray<PngPage>,
  {
    snapshotDir,
    diffDir = join(snapshotDir, DIFF_DIRECTORY_NAME),
    update = process.env.UPDATE_SNAPSHOTS === '1',
    ci = process.env.CI === 'true',
    threshold = 0.1,
    maxMismatchRatio = DEFAULT_MAX_MISMATCH_RATIO,
  }: CompareWithBaselineOptions,
): Promise<BaselineResult> => {
  const baseline = await readBaseline(snapshotDir, name);

  if (!baseline || update) {
    if (!baseline && ci) {
      return {
        pass: false,
        written: false,
        result: undefined,
        reason: `No baseline for "${name}" and CI refuses to create one. Run UPDATE_SNAPSHOTS=1 locally and commit ${snapshotDir}.`,
      };
    }
    await writeBaseline(snapshotDir, name, pages);
    return {
      pass: true,
      written: true,
      result: undefined,
      reason: baseline
        ? `Baseline for "${name}" updated (${pages.length} pages).`
        : `Baseline for "${name}" created (${pages.length} pages). Review and commit it.`,
    };
  }

  const result = await comparePageSets(pages, baseline, {
    diffDir,
    label: name,
    threshold,
  });
  const offending = result.pages.filter(
    (page) => page.status !== 'match' && page.mismatchRatio > maxMismatchRatio,
  );
  const pass = result.pageCountMatches && offending.length === 0;
  return {
    pass,
    written: false,
    result,
    reason: pass
      ? `"${name}" matches baseline (${pages.length} pages, max ${result.maxMismatchRatio.toFixed(5)}).`
      : [
          result.pageCountMatches
            ? undefined
            : `page count ${result.pageCountActual} != baseline ${result.pageCountExpected}`,
          ...offending.map(
            (page) =>
              `page ${page.page}: ${page.status} ${page.mismatchRatio.toFixed(5)} > ${maxMismatchRatio}` +
              (page.diffPath ? ` (${page.diffPath})` : ''),
          ),
        ]
          .filter((part): part is string => part !== undefined)
          .join('; '),
  };
};
