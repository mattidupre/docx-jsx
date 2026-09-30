import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import type { Browser } from 'puppeteer-core';
import { DocumentProvider, Stack } from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import { isErrorObject } from '../../utils/error';
import { pdfToPngPages } from '../../visual/pdfToPngPages';
import { htmlToPdf } from './htmlToPdf';

/** One inch at the 96dpi the pages are rasterised at. */
const MARGIN_PX = 96;

const PIXEL_TOLERANCE = 1;

const DARK_CHANNEL = 64;

function BarDocument() {
  return (
    <DocumentProvider>
      <Stack margin={{ top: '1in', right: '1in', bottom: '1in', left: '1in' }}>
        <div style={{ height: '1in', background: '#000' }} />
      </Stack>
    </DocumentProvider>
  );
}

/** The outermost columns and the first row holding a dark pixel. */
const findDarkExtent = (buffer: Buffer) => {
  const { data, width, height } = PNG.sync.read(buffer);
  let left = width;
  let right = -1;
  let top = height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4] < DARK_CHANNEL) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
      }
    }
  }
  return { left, right, top, width };
};

describe('htmlToPdf page geometry', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchTestBrowser();
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
  });

  it('draws content at its stack margins, without body margin or scaling', async () => {
    const pdf = await htmlToPdf(reactToHtml(BarDocument, 'pdf'), { browser });
    if (isErrorObject(pdf)) {
      throw new Error(`Expected a PDF, received an error: ${String(pdf)}`);
    }

    const [page] = await pdfToPngPages(pdf, { browser });
    const { left, right, top, width } = findDarkExtent(page.buffer);

    // With Chrome's default 8px body margin the page is shrunk to 99.03% and
    // shifted right and down, so the bar starts near 103px instead of 96px.
    expect(Math.abs(left - MARGIN_PX)).toBeLessThanOrEqual(PIXEL_TOLERANCE);
    expect(Math.abs(width - 1 - right - MARGIN_PX)).toBeLessThanOrEqual(
      PIXEL_TOLERANCE,
    );
    expect(Math.abs(top - MARGIN_PX)).toBeLessThanOrEqual(PIXEL_TOLERANCE);
  });
});
