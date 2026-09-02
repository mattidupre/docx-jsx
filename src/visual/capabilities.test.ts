import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import { TypographyDocument } from '../fixtures/visualDocuments/typographyDocument';
import { reactToPdf } from '../reactToPdf';
import { isErrorObject, stringifyErrorObject } from '../utils/error';
import { type Capability, probePdftoppm, probeWord } from './capabilities';
import { comparePageSets } from './compare';
import { US_LETTER_PIXELS, type PngPage } from './entities';
import { pdfToPngPages, pdfToPngPagesViaPdftoppm } from './pdfToPngPages';

const PDFTOPPM = probePdftoppm();

if (!PDFTOPPM.available) {
  console.warn(`[visual] tier 2 (poppler) skipped: ${PDFTOPPM.reason}`);
}

/**
 * `probeWord` launches Microsoft Word through Apple Events, which is far too
 * disruptive to do on every test run, so it is opt-in.
 */
const WORD_PROBE_ENABLED = process.env.MATTI_DOCS_PROBE_WORD === '1';

const WORD_TIER_OFF: Capability = {
  available: false,
  reason:
    'Word probing is off by default because it launches Microsoft Word; set MATTI_DOCS_PROBE_WORD=1 to run it. ' +
    'On Word 16.112.2 every Microsoft Word Suite command answers -1708, so a docx -> pdf conversion driven by Word is impossible and there is no Word tier.',
};

/**
 * pdfjs and poppler disagree on antialiasing, so the two rasters of one PDF are
 * never pixel identical. Measured on this fixture at a loose `threshold: 0.2`:
 * 0.0082. The ceiling is set an order of magnitude above that, because the
 * point of this tier is structural agreement, not pixels.
 */
const MAX_RASTERISER_DISAGREEMENT = 0.05;

describe('visual capabilities', () => {
  let browser: undefined | Browser;
  let pdf: Uint8Array;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    const result = await reactToPdf(TypographyDocument, { browser });
    if (isErrorObject(result)) {
      throw new Error(`reactToPdf failed: ${stringifyErrorObject(result)}`);
    }
    if (!(result instanceof Uint8Array)) {
      throw new TypeError('reactToPdf returned no bytes.');
    }
    pdf = result;
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
  });

  it('records why there is no Microsoft Word tier', async () => {
    const capability = WORD_PROBE_ENABLED ? await probeWord() : WORD_TIER_OFF;
    console.warn(`[visual] tier 3 (Microsoft Word) skipped: ${capability.reason}`);
    expect(
      capability.available,
      `Word now answers its AppleScript Suite (${capability.reason}), so a Word-rendered DOCX tier has become implementable and this test should be replaced by it.`,
    ).toBe(false);
  });

  describe.skipIf(!PDFTOPPM.available)('tier 2: poppler cross-check', () => {
    let pdfjsPages: ReadonlyArray<PngPage>;
    let popplerPages: ReadonlyArray<PngPage>;

    beforeAll(async () => {
      if (!browser) {
        throw new Error('The shared browser was not launched.');
      }
      pdfjsPages = await pdfToPngPages(pdf, { browser });
      popplerPages = await pdfToPngPagesViaPdftoppm(pdf);
    });

    it('agrees with pdfjs on page count and page size', () => {
      expect(
        popplerPages.map((page) => `${page.width}x${page.height}`),
        'poppler and pdfjs must read the same page geometry out of the same PDF',
      ).toEqual(pdfjsPages.map((page) => `${page.width}x${page.height}`));
      expect(popplerPages.map((page) => `${page.width}x${page.height}`)).toEqual(
        popplerPages.map(
          () => `${US_LETTER_PIXELS.width}x${US_LETTER_PIXELS.height}`,
        ),
      );
    });

    it('renders the same content as pdfjs', async () => {
      const comparison = await comparePageSets(popplerPages, pdfjsPages, {
        threshold: 0.2,
      });
      console.info(
        `[visual] poppler vs pdfjs: max ${comparison.maxMismatchRatio.toFixed(4)}, mean ${comparison.meanMismatchRatio.toFixed(4)}`,
      );
      expect(
        comparison.maxMismatchRatio,
        `two independent rasterisers disagreed by more than ${MAX_RASTERISER_DISAGREEMENT} on the same PDF, which means the PDF itself is ambiguous rather than that one renderer is fussy`,
      ).toBeLessThanOrEqual(MAX_RASTERISER_DISAGREEMENT);
    });
  });
});
