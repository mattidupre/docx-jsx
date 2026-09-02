import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Browser } from 'puppeteer-core';
import { reactToPdf } from './reactToPdf';
import { MOCK_EXTERNAL_URL, MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { closeTestBrowser, launchTestBrowser } from './fixtures/browser';
import { isErrorObject, stringifyErrorObject } from './utils/error';

const MOCK_ASSETS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mockAssets',
);

const CUSTOM_FONT_FILE_NAME = 'Pacifico.ttf';

/**
 * `DocumentProvider` defaults to 8.5in x 11in, i.e. 612pt x 792pt.
 */
const EXPECTED_PAGE_SIZE = { width: 612, height: 792 } as const;

/**
 * The number of pages `MockDocument` paginates into at the default font size.
 */
const EXPECTED_PAGE_COUNT = 15;

/**
 * The last stack of the fixture: the media, rules and navigation page.
 */
const EXPECTED_LAST_PAGE_TEXT = 'Media, rules and navigation';

/** The fixture's two `<a href>`/`Link href` targets, in document order. */
const EXPECTED_LINK_URLS = [
  'https://www.google.com/',
  MOCK_EXTERNAL_URL,
] as const;

const expectPdfBytes = (result: unknown): Uint8Array => {
  if (isErrorObject(result)) {
    throw new Error(
      `Expected a PDF, received an error: ${stringifyErrorObject(result)}`,
    );
  }
  if (!(result instanceof Uint8Array)) {
    throw new TypeError('Expected a PDF, received a non-binary result.');
  }
  expect(result.byteLength).toBeGreaterThan(0);
  expect(new TextDecoder().decode(result.subarray(0, 5))).toBe('%PDF-');
  return result;
};

/**
 * What a reader would be able to click: a URL for an external target, a
 * destination for a link into the document itself.
 */
type LinkAnnotation = {
  readonly subtype: string;
  readonly url?: string;
  readonly dest?: null | string | ReadonlyArray<unknown>;
};

type PdfSummary = {
  readonly pageCount: number;
  readonly pageSizes: ReadonlyArray<{ width: number; height: number }>;
  readonly lastPageText: string;
  readonly links: ReadonlyArray<LinkAnnotation>;
};

const readPdf = async (bytes: Uint8Array): Promise<PdfSummary> => {
  // pdf.js takes ownership of the buffer it is handed.
  const loadingTask = getDocument({ data: Uint8Array.from(bytes) });
  try {
    const pdf = await loadingTask.promise;
    const pageSizes = [];
    const links: Array<LinkAnnotation> = [];
    let lastPageText = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const { width, height } = page.getViewport({ scale: 1 });
      pageSizes.push({ width, height });
      const annotations = (await page.getAnnotations()) as ReadonlyArray<
        LinkAnnotation
      >;
      links.push(
        ...annotations.filter((annotation) => annotation.subtype === 'Link'),
      );
      if (pageNumber === pdf.numPages) {
        const { items } = await page.getTextContent();
        lastPageText = items
          .map((item) => ('str' in item ? item.str : ''))
          .join('');
      }
    }
    return { pageCount: pdf.numPages, pageSizes, lastPageText, links };
  } finally {
    await loadingTask.destroy();
  }
};

describe('reactToPdf', () => {
  let browser: Browser;
  let summary: PdfSummary;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    const result = await reactToPdf(MockDocument, {
      browser,
      publicDirectory: MOCK_ASSETS_PATH,
    });
    const bytes = expectPdfBytes(result);
    await writeTestFile('reactToPdf.pdf', bytes);
    summary = await readPdf(bytes);
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
  });

  it('creates a pdf file', () => {
    const { pageCount, pageSizes } = summary;
    expect(pageCount).toBe(EXPECTED_PAGE_COUNT);
    expect(pageSizes).toEqual(
      Array.from({ length: EXPECTED_PAGE_COUNT }, () => EXPECTED_PAGE_SIZE),
    );
  });

  it('paginates the last stack onto the last page', () => {
    // Everything the last stack renders -- an `Image`, two `Divider`s, a
    // `Spacer`, two `List`s and the links -- has to fit the page the page
    // count above pins, or the count is right for the wrong reason.
    expect(summary.lastPageText).toContain(EXPECTED_LAST_PAGE_TEXT);
    expect(summary.lastPageText).toContain('Internal Link Text');
  });

  it('writes every link in the fixture as an annotation', () => {
    expect(
      summary.links
        .filter((link) => link.url !== undefined)
        .map((link) => link.url),
    ).toEqual([...EXPECTED_LINK_URLS]);

    // An internal link only becomes a clickable jump if Chrome resolved the
    // `href="#id"` against a `Bookmark` in the rendered page content.
    expect(
      summary.links.filter(
        (link) => link.dest !== undefined && link.dest !== null,
      ),
    ).toHaveLength(1);
  });

  it('supports custom fonts', async () => {
    const result = await reactToPdf(MockDocument, {
      browser,
      publicDirectory: MOCK_ASSETS_PATH,
      pageStyleSheets: [
        `
        @font-face {
          font-family: "Mock";
          src: url("/${CUSTOM_FONT_FILE_NAME}") format("truetype");
        }
        `,
      ],
      styleSheets: [
        `
        :host {
          font-family: Mock;
        }
        `,
      ],
    });
    const bytes = expectPdfBytes(result);
    await writeTestFile('reactToPdf-pacifico.pdf', bytes);

    // The font is only embedded if the request interceptor served it from
    // `publicDirectory` and the paged renderer applied it.
    expect(new TextDecoder('latin1').decode(bytes)).toContain('Pacifico');

    // Pacifico is a larger font: it must reflow onto more pages, and every one
    // of those pages must still be exactly the configured page size.
    const { pageCount, pageSizes } = await readPdf(bytes);
    expect(pageCount).toBeGreaterThan(EXPECTED_PAGE_COUNT);
    expect(pageSizes).toEqual(
      Array.from({ length: pageCount }, () => EXPECTED_PAGE_SIZE),
    );
  });
});
