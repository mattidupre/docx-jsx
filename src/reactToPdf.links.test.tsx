import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import {
  Bookmark,
  Break,
  DocumentProvider,
  Link,
  Stack,
} from './reactComponents';
import { reactToPdf } from './reactToPdf';
import { closeTestBrowser, launchTestBrowser } from './fixtures/browser';
import { isErrorObject, stringifyErrorObject } from './utils/error';

const BOOKMARK_ID = 'cetology';

const EXTERNAL_URL = 'https://example.com/loomings';

const LINK_TEXT = 'Jump to cetology';

/**
 * The link sits on the first page and its target on the second, so an
 * annotation resolving to page 1 would prove the destination was lost rather
 * than merely present.
 */
function NavigationDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>
          <Link to={`#${BOOKMARK_ID}`}>{LINK_TEXT}</Link>
        </p>
        <p>
          <Link href={EXTERNAL_URL}>Loomings</Link>
        </p>
        <Break />
        <h2>
          <Bookmark id={BOOKMARK_ID}>Cetology</Bookmark>
        </h2>
      </Stack>
    </DocumentProvider>
  );
}

/** The bookmark is missing, so the link has nowhere to go. */
function DanglingLinkDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>
          <Link to="#nowhere">{LINK_TEXT}</Link>
        </p>
      </Stack>
    </DocumentProvider>
  );
}

const expectPdfBytes = (result: unknown): Uint8Array => {
  if (isErrorObject(result)) {
    throw new Error(
      `Expected a PDF, received an error: ${stringifyErrorObject(result)}`,
    );
  }
  if (!(result instanceof Uint8Array)) {
    throw new TypeError('Expected a PDF, received a non-binary result.');
  }
  return result;
};

type LinkAnnotation = {
  readonly subtype: string;
  readonly url?: string;
  readonly dest?: null | string | ReadonlyArray<unknown>;
};

type PdfDocument = {
  readonly numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getAnnotations: () => Promise<ReadonlyArray<LinkAnnotation>>;
    getTextContent: () => Promise<{
      readonly items: ReadonlyArray<{ readonly str?: string }>;
    }>;
  }>;
  getDestination: (id: string) => Promise<null | ReadonlyArray<unknown>>;
  getPageIndex: (reference: unknown) => Promise<number>;
};

type OpenedPdf = {
  readonly document: PdfDocument;
  readonly close: () => Promise<void>;
};

/**
 * pdfjs reads the finished file the way a viewer does, so what it reports is
 * what a reader would actually be able to click.
 */
const openPdf = async (bytes: Uint8Array): Promise<OpenedPdf> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    // Resolving a worker from the filesystem costs more than reading one
    // small document on the main thread.
    disableWorker: true,
  } as never) as {
    promise: Promise<unknown>;
    destroy: () => Promise<void>;
  };
  return {
    document: (await loadingTask.promise) as PdfDocument,
    close: () => loadingTask.destroy(),
  };
};

const linkAnnotations = async (
  pdf: PdfDocument,
  pageNumber: number,
): Promise<ReadonlyArray<LinkAnnotation>> => {
  const page = await pdf.getPage(pageNumber);
  return (await page.getAnnotations()).filter(
    (annotation) => annotation.subtype === 'Link',
  );
};

const pageText = async (
  pdf: PdfDocument,
  pageNumber: number,
): Promise<string> => {
  const page = await pdf.getPage(pageNumber);
  const { items } = await page.getTextContent();
  return items.map((item) => item.str ?? '').join('');
};

/**
 * A `dest` is either a name to look up in the document's destination table or
 * the explicit array itself; both end in a reference to the page they land on.
 */
const destinationPageNumber = async (
  pdf: PdfDocument,
  destination: LinkAnnotation['dest'],
): Promise<number> => {
  const explicit =
    typeof destination === 'string'
      ? await pdf.getDestination(destination)
      : destination;
  if (!explicit) {
    throw new TypeError(`The destination "${String(destination)}" is unknown.`);
  }
  return (await pdf.getPageIndex(explicit[0])) + 1;
};

describe('reactToPdf links', () => {
  let browser: Browser;
  let opened: OpenedPdf;
  let pdf: PdfDocument;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    opened = await openPdf(
      expectPdfBytes(await reactToPdf(NavigationDocument, { browser })),
    );
    pdf = opened.document;
  });

  afterAll(async () => {
    await opened?.close();
    await closeTestBrowser(browser);
  });

  it('paginates the bookmark onto a page of its own', async () => {
    expect(pdf.numPages).toBe(2);
    expect(await pageText(pdf, 2)).toContain('Cetology');
  });

  it('writes an external link as a url annotation', async () => {
    expect(
      (await linkAnnotations(pdf, 1))
        .filter((annotation) => annotation.url !== undefined)
        .map((annotation) => annotation.url),
    ).toEqual([EXTERNAL_URL]);
  });

  it('writes an internal link as an annotation that jumps to the bookmark page', async () => {
    // Chrome resolves `href="#id"` against the document and never looks inside
    // a shadow root, so this only holds while `PageTemplate` renders its pages
    // in the light DOM. The DOCX target has the same jump through
    // `InternalHyperlink` on a `w:bookmarkStart`.
    expect(await pageText(pdf, 1)).toContain(LINK_TEXT);

    const internalLinks = (await linkAnnotations(pdf, 1)).filter(
      (annotation) => annotation.dest !== undefined && annotation.dest !== null,
    );
    expect(internalLinks).toHaveLength(1);
    expect(await destinationPageNumber(pdf, internalLinks[0].dest)).toBe(2);
  });

  it('leaves an internal link with no bookmark as plain text', async () => {
    // A destination that does not exist must not become a link a reader can
    // click into nowhere; the text is still rendered.
    const dangling = await openPdf(
      expectPdfBytes(await reactToPdf(DanglingLinkDocument, { browser })),
    );
    try {
      expect(await pageText(dangling.document, 1)).toContain(LINK_TEXT);
      expect(await linkAnnotations(dangling.document, 1)).toHaveLength(0);
    } finally {
      await dangling.close();
    }
  });
});
