import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import {
  compareWithBaseline,
  type CompareWithBaselineOptions,
} from './baseline';
import { toPngPage, type PngPage } from './entities';

/** A solid colour page, small enough that a suite of them costs nothing. */
const solidPage = (
  index: number,
  [red, green, blue]: readonly [number, number, number],
  width = 8,
  height = 8,
): PngPage => {
  const png = new PNG({ width, height });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red;
    png.data[offset + 1] = green;
    png.data[offset + 2] = blue;
    png.data[offset + 3] = 255;
  }
  return toPngPage(PNG.sync.write(png), index);
};

const WHITE = [255, 255, 255] as const;

const BLACK = [0, 0, 0] as const;

describe('compareWithBaseline', () => {
  let snapshotDir: string;

  /**
   * `compareWithBaseline` reads `UPDATE_SNAPSHOTS` and `CI` from the
   * environment. These tests exercise the mechanism itself, so both are pinned:
   * running the suite with `UPDATE_SNAPSHOTS=1` must not change what they mean.
   */
  const compare = (
    name: string,
    pages: ReadonlyArray<PngPage>,
    options: Omit<CompareWithBaselineOptions, 'snapshotDir'> = {},
  ) =>
    compareWithBaseline(name, pages, {
      snapshotDir,
      update: false,
      ci: false,
      ...options,
    });

  beforeEach(async () => {
    snapshotDir = await mkdtemp(join(tmpdir(), 'matti-docs-baseline-'));
  });

  afterEach(async () => {
    await rm(snapshotDir, { recursive: true, force: true });
  });

  const pageFiles = async () =>
    (await readdir(snapshotDir)).filter((file) => file.endsWith('.png')).sort();

  it('creates a missing baseline and reports that it wrote one', async () => {
    const result = await compare('page-set', [
      solidPage(0, WHITE),
      solidPage(1, WHITE),
    ]);
    expect(result.written, result.reason).toBe(true);
    expect(result.reason).toContain('created');
    expect(await pageFiles()).toEqual([
      'page-set-page-01.png',
      'page-set-page-02.png',
    ]);
  });

  it('refuses to create a baseline under CI', async () => {
    const result = await compare('page-set', [solidPage(0, WHITE)], {
      ci: true,
    });
    expect(result.pass).toBe(false);
    expect(result.written).toBe(false);
    expect(result.reason).toContain('UPDATE_SNAPSHOTS=1');
    expect(await pageFiles()).toEqual([]);
  });

  it('passes when the pages are unchanged', async () => {
    const pages = [solidPage(0, WHITE), solidPage(1, WHITE)];
    await compare('page-set', pages);
    const result = await compare('page-set', pages);
    expect(result.pass, result.reason).toBe(true);
    expect(result.written).toBe(false);
    expect(result.reason).toContain('matches baseline');
  });

  it('fails and names the page when pixels change', async () => {
    await compare('page-set', [solidPage(0, WHITE)]);
    const result = await compare('page-set', [solidPage(0, BLACK)]);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('page 1: pixel-diff');
    expect(result.result?.maxMismatchRatio).toBe(1);
  });

  it('fails on a page count change rather than averaging it away', async () => {
    await compare('page-set', [solidPage(0, WHITE), solidPage(1, WHITE)]);
    const result = await compare('page-set', [solidPage(0, WHITE)]);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('page count 1 != baseline 2');
  });

  it('fails on a page size change', async () => {
    await compare('page-set', [solidPage(0, WHITE)]);
    const result = await compare('page-set', [solidPage(0, WHITE, 16, 16)]);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('size-mismatch');
  });

  it('deletes stale pages when a shorter document is written', async () => {
    await compare('page-set', [
      solidPage(0, WHITE),
      solidPage(1, WHITE),
      solidPage(2, WHITE),
    ]);
    const result = await compare('page-set', [solidPage(0, WHITE)], {
      update: true,
    });
    expect(result.written).toBe(true);
    expect(await pageFiles()).toEqual(['page-set-page-01.png']);
  });

  it('only reads the pages that belong to its own name', async () => {
    await writeFile(
      join(snapshotDir, 'other-page-01.png'),
      solidPage(0, BLACK).buffer,
    );
    const result = await compare('page-set', [solidPage(0, WHITE)]);
    expect(result.written).toBe(true);
    expect(await pageFiles()).toEqual([
      'other-page-01.png',
      'page-set-page-01.png',
    ]);
  });
});
