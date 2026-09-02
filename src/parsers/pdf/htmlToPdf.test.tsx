import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import type { FontsConfig } from '../../entities';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import { isErrorObject } from '../../utils/error';
import { htmlToPdf } from './htmlToPdf';

const SOURCE_FONT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'mockAssets',
  'Pacifico.ttf',
);

/**
 * The served file is renamed and nested so that a passing test can only mean
 * the interceptor joined `publicDirectory` with the requested path and read the
 * bytes from disk. `Pacifico` is the family name inside the file.
 */
const SERVED_FONT_PATH = '/nested/served-font.ttf';

const EMBEDDED_FONT_NAME = 'Pacifico';

const createFonts = (src: string): FontsConfig => ({
  Served: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [{ documentType: 'web', src, format: 'truetype' }],
      },
    ],
  },
});

function ServedFontDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Typography as="p" fontFamily="Served">
          Served from the public directory.
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}

const documentHtml = () => reactToHtml(ServedFontDocument, 'pdf');

const expectPdfText = (result: unknown): string => {
  if (isErrorObject(result)) {
    throw new Error(`Expected a PDF, received an error: ${String(result)}`);
  }
  if (!(result instanceof Uint8Array)) {
    throw new TypeError('Expected a PDF, received a non-binary result.');
  }
  return new TextDecoder('latin1').decode(result);
};

describe('htmlToPdf', () => {
  let browser: Browser;
  let publicDirectory: string;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    publicDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'matti-docs-public-'),
    );
    await fs.mkdir(path.join(publicDirectory, 'nested'));
    await fs.copyFile(
      SOURCE_FONT_PATH,
      path.join(publicDirectory, SERVED_FONT_PATH),
    );
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
    if (publicDirectory) {
      await fs.rm(publicDirectory, { recursive: true, force: true });
    }
  });

  it('serves a requested file from publicDirectory', async () => {
    const pdfText = expectPdfText(
      await htmlToPdf(documentHtml(), {
        browser,
        publicDirectory,
        fonts: createFonts(SERVED_FONT_PATH),
      }),
    );

    expect(pdfText).toContain(EMBEDDED_FONT_NAME);
  });

  it('renders without the file when publicDirectory has no match', async () => {
    const pdfText = expectPdfText(
      await htmlToPdf(documentHtml(), {
        browser,
        publicDirectory,
        fonts: createFonts('/nested/missing-font.ttf'),
      }),
    );

    expect(pdfText.startsWith('%PDF-')).toBe(true);
    expect(pdfText).not.toContain(EMBEDDED_FONT_NAME);
  });

  it('closes the page it opened', async () => {
    const pageCountBefore = (await browser.pages()).length;

    await htmlToPdf(documentHtml(), { browser, publicDirectory });

    expect((await browser.pages()).length).toBe(pageCountBefore);
  });

  it('returns an error object when a page cannot be opened', async () => {
    const closedBrowser = await launchTestBrowser();
    await closeTestBrowser(closedBrowser);

    // The page never opens, so the cleanup has nothing to close and must not
    // throw the rejection out of the finally block.
    const result = await htmlToPdf(documentHtml(), { browser: closedBrowser });

    expect(isErrorObject(result)).toBe(true);
  });
});
