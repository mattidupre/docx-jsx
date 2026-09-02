import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import type { Browser } from 'puppeteer-core';
import { DocumentProvider, Image, Stack } from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import { MOCK_IMAGE_FILE_NAME } from '../../fixtures/mockImage';
import { isErrorObject } from '../../utils/error';
import { pdfToPngPages } from '../../visual/pdfToPngPages';
import { htmlToPdf } from './htmlToPdf';

const SOURCE_IMAGE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'mockAssets',
  MOCK_IMAGE_FILE_NAME,
);

/**
 * The file is renamed and nested, so a page that draws it can only mean the
 * request interceptor joined `publicDirectory` with the requested path.
 */
const SERVED_IMAGE_SRC = '/nested/served-swatch.png';

/** The top-right quadrant of the fixture image, which nothing else draws. */
const SWATCH_YELLOW = { red: 0xf2, green: 0xc1, blue: 0x1b };

const CHANNEL_TOLERANCE = 24;

function ImageDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>Above the image.</p>
        <Image src={SERVED_IMAGE_SRC} alt="Colour swatch" width="4in" />
        <p>Below the image.</p>
      </Stack>
    </DocumentProvider>
  );
}

function TextOnlyDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>Above the image.</p>
        <p>Below the image.</p>
      </Stack>
    </DocumentProvider>
  );
}

const expectPdfBytes = (result: unknown): Uint8Array => {
  if (isErrorObject(result)) {
    throw new Error(`Expected a PDF, received an error: ${String(result)}`);
  }
  if (!(result instanceof Uint8Array)) {
    throw new TypeError('Expected a PDF, received a non-binary result.');
  }
  return result;
};

const countSwatchPixels = (buffer: Buffer): number => {
  const { data } = PNG.sync.read(buffer);
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (
      Math.abs(data[index] - SWATCH_YELLOW.red) <= CHANNEL_TOLERANCE &&
      Math.abs(data[index + 1] - SWATCH_YELLOW.green) <= CHANNEL_TOLERANCE &&
      Math.abs(data[index + 2] - SWATCH_YELLOW.blue) <= CHANNEL_TOLERANCE
    ) {
      count += 1;
    }
  }
  return count;
};

describe('htmlToPdf with an Image', () => {
  let browser: Browser;
  let publicDirectory: string;
  let imagePdf: Uint8Array;
  let textOnlyPdf: Uint8Array;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    publicDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'matti-docs-image-pdf-'),
    );
    await fs.mkdir(path.join(publicDirectory, 'nested'));
    await fs.copyFile(
      SOURCE_IMAGE_PATH,
      path.join(publicDirectory, SERVED_IMAGE_SRC),
    );

    imagePdf = expectPdfBytes(
      await htmlToPdf(reactToHtml(ImageDocument, 'pdf'), {
        browser,
        publicDirectory,
      }),
    );
    textOnlyPdf = expectPdfBytes(
      await htmlToPdf(reactToHtml(TextOnlyDocument, 'pdf'), {
        browser,
        publicDirectory,
      }),
    );
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
    if (publicDirectory) {
      await fs.rm(publicDirectory, { recursive: true, force: true });
    }
  });

  it('embeds an image XObject served from publicDirectory', () => {
    const pdfText = new TextDecoder('latin1').decode(imagePdf);

    expect(pdfText).toMatch(/\/Subtype\s*\/Image/);
    expect(imagePdf.byteLength).toBeGreaterThan(textOnlyPdf.byteLength);
  });

  it('draws the image on the page', async () => {
    const [page] = await pdfToPngPages(imagePdf, { browser });

    // A 4in-wide image on a 96dpi page is 384px across; the yellow quadrant is
    // a quarter of it, so anything close to zero means it was never drawn.
    expect(countSwatchPixels(page.buffer)).toBeGreaterThan(1000);
  });

  it('draws nothing where the image is absent', async () => {
    const [page] = await pdfToPngPages(textOnlyPdf, { browser });

    expect(countSwatchPixels(page.buffer)).toBe(0);
  });
});
