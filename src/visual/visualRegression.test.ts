import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import {
  VISUAL_DOCUMENTS,
  type VisualDocument,
} from '../fixtures/visualDocuments';
import { US_LETTER_PIXELS } from './entities';
import { type BaselineResult, compareWithBaseline } from './baseline';
import { type PageSetComparison, compareTargets } from './compare';
import {
  VISUAL_TARGETS,
  type RenderedPages,
  type VisualTarget,
  renderVisualDocument,
} from './renderVisualDocument';
import {
  prepareContactSheetDir,
  writeContactSheet,
  writeContactSheetIndex,
} from './contactSheet';

const SNAPSHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '__image_snapshots__',
);

const IS_UPDATING_BASELINES = process.env.UPDATE_SNAPSHOTS === '1';

const EXPECTED_PAGE_SIZE = `${US_LETTER_PIXELS.width}x${US_LETTER_PIXELS.height}`;

/**
 * Ceiling for the DOCX-vs-PDF "reconciliation drift" metric, which is reported
 * per page and asserted only as an upper bound.
 *
 * The two rasters come from different layout engines: pdfjs renders Chrome's
 * paginated output, docx-preview re-lays the OOXML out in the browser and does
 * not reflow content across sheets. Glyphs therefore land in slightly different
 * places and even a loose `threshold: 0.2` counts a good deal of text as
 * differing, so this number can never be tightened towards zero.
 *
 * Measured maxima at the time of writing: links 0.0114, lists 0.0133,
 * navigation 0.0222, grid 0.0263, split 0.0395, columns 0.0736, media 0.0482,
 * typography 0.0512, svg 0.0663, breaks 0.0784. The ceiling is roughly three
 * times the worst of those: generous enough to absorb font substitution on
 * another machine, tight enough that losing a header, dropping a table or
 * collapsing a page's margins still fails.
 *
 * The `svg` fixture is the useful calibration point. Its DOCX deliberately
 * omits two graphics that the PDF draws, which is the largest legitimate
 * structural difference any fixture here contains, and it still measures 0.07.
 */
const MAX_RECONCILIATION_DRIFT = 0.25;

type FixtureRun = {
  readonly pages: RenderedPages;
  readonly baselines: Readonly<Record<VisualTarget, BaselineResult>>;
  readonly drift: PageSetComparison;
  readonly contactSheetPath: string;
};

const runFixture = async (
  visualDocument: VisualDocument,
  browser: Browser,
): Promise<FixtureRun> => {
  const { name } = visualDocument;
  const { diffDir } = await prepareContactSheetDir(name);
  const pages = await renderVisualDocument(visualDocument, { browser });

  const baselineEntries = await Promise.all(
    VISUAL_TARGETS.map(
      async (target) =>
        [
          target,
          await compareWithBaseline(`${name}-${target}`, pages[target], {
            snapshotDir: SNAPSHOT_DIR,
          }),
        ] as const,
    ),
  );
  const baselines = Object.fromEntries(baselineEntries) as Record<
    VisualTarget,
    BaselineResult
  >;

  // Only the pages both targets produced are compared: docx-preview does not
  // reflow content across sheets, so a trailing page that exists in one target
  // and not the other is a known structural difference, not drift.
  const commonPageCount = Math.min(pages.docx.length, pages.pdf.length);
  const drift = await compareTargets(
    { name: 'docx', pages: pages.docx.slice(0, commonPageCount) },
    { name: 'pdf', pages: pages.pdf.slice(0, commonPageCount) },
    { diffDir },
  );

  const contactSheetPath = await writeContactSheet({
    name,
    columns: VISUAL_TARGETS.map((target) => ({
      label: target,
      pages: pages[target],
      note: baselines[target].reason,
    })),
    diffDir,
    diffLabel: 'docx vs pdf',
    diffPageCount: commonPageCount,
    summary: [
      `pages: ${VISUAL_TARGETS.map(
        (target) => `${target} ${pages[target].length}`,
      ).join(', ')}`,
      `docx-vs-pdf drift: max ${drift.maxMismatchRatio.toFixed(4)}, mean ${drift.meanMismatchRatio.toFixed(4)}`,
    ],
  });

  return { pages, baselines, drift, contactSheetPath };
};

describe('visual regression', () => {
  let browser: undefined | Browser;
  const contactSheetPaths: Array<string> = [];

  beforeAll(async () => {
    browser = await launchTestBrowser();
  });

  afterAll(async () => {
    const indexPath = await writeContactSheetIndex(contactSheetPaths);
    console.info(`[visual] contact sheets: open ${indexPath}`);
    await closeTestBrowser(browser);
  });

  describe.each(
    VISUAL_DOCUMENTS.map((document_) => [document_.name, document_] as const),
  )('%s', (name, visualDocument) => {
    let run: FixtureRun;

    beforeAll(async () => {
      if (!browser) {
        throw new Error('The shared browser was not launched.');
      }
      run = await runFixture(visualDocument, browser);
      contactSheetPaths.push(run.contactSheetPath);
      console.info(
        `[visual] ${name}: ` +
          VISUAL_TARGETS.map(
            (target) => `${target} ${run.pages[target].length}p`,
          ).join(' ') +
          ` | docx-vs-pdf drift ${run.drift.pages
            .map((page) => page.mismatchRatio.toFixed(4))
            .join(' ')}` +
          ` | sheet ${run.contactSheetPath}`,
      );
    });

    for (const target of VISUAL_TARGETS) {
      it(`matches the committed ${target} baseline`, () => {
        const result = run.baselines[target];
        expect(result.pass, result.reason).toBe(true);
        // A run that created or refreshed a baseline is not evidence of a
        // pass; it only counts when it compared against a committed one.
        expect(result.written, result.reason).toBe(IS_UPDATING_BASELINES);
      });
    }

    it('renders every page at US Letter size in every target', () => {
      for (const target of VISUAL_TARGETS) {
        const pages = run.pages[target];
        expect(
          pages.map((page) => `${page.width}x${page.height}`),
          `${name}: ${target} pages must all be ${EXPECTED_PAGE_SIZE} at 96dpi`,
        ).toEqual(pages.map(() => EXPECTED_PAGE_SIZE));
      }
    });

    it('paginates HTML and PDF to the same page count', () => {
      const { html, pdf } = run.pages;
      expect(
        html.length,
        `${name}: the HTML preview and the PDF are produced by the same paginator, so a difference (html ${html.length}, pdf ${pdf.length}) means one of them lost content`,
      ).toBe(pdf.length);
      expect(html.length, `${name}: rendered no pages at all`).toBeGreaterThan(
        0,
      );
    });

    it('keeps DOCX-vs-PDF reconciliation drift below the ceiling', () => {
      const { drift } = run;
      const perPage = drift.pages
        .map((page) => `page ${page.page} ${page.mismatchRatio.toFixed(4)}`)
        .join(', ');
      expect(
        drift.maxMismatchRatio,
        `${name}: docx-vs-pdf drift exceeded ${MAX_RECONCILIATION_DRIFT} (${perPage}); see ${run.contactSheetPath}`,
      ).toBeLessThanOrEqual(MAX_RECONCILIATION_DRIFT);
    });
  });
});
