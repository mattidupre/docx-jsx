import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser } from 'puppeteer-core';
import { reactToDocx } from '../reactToDocx';
import { reactToHtmlDocument } from '../reactToHtmlDocument';
import { reactToPdf } from '../reactToPdf';
import { mockFonts } from '../fixtures/mockFonts';
import type { VisualDocument } from '../fixtures/visualDocuments';
import { isErrorObject, stringifyErrorObject } from '../utils/error';
import type { PngPage } from './entities';
import { docxToPngPages } from './docxToPngPages';
import { htmlToPngPages } from './htmlToPngPages';
import { pdfToPngPages } from './pdfToPngPages';

export const VISUAL_TARGETS = ['html', 'pdf', 'docx'] as const;

export type VisualTarget = (typeof VISUAL_TARGETS)[number];

export type RenderedPages = Readonly<
  Record<VisualTarget, ReadonlyArray<PngPage>>
>;

/**
 * Where a fixture's relative asset paths resolve from. `reactToPdf` serves the
 * directory to the page and `reactToDocx` reads the bytes out of it, so a
 * fixture can use `<Image src="swatch.png" />` instead of pasting a data URL
 * into the source.
 */
const DEFAULT_PUBLIC_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'mockAssets',
);

export type RenderVisualDocumentOptions = {
  readonly browser: Browser;
  readonly publicDirectory?: string;
};

/**
 * Render one fixture through the public entry points and rasterise all three
 * targets. Nothing touches the filesystem: the bytes go straight from
 * `reactToDocx` / `reactToPdf` / `reactToHtmlDocument` into the renderers, so a
 * failure can never be blamed on a stale file left over from an earlier run.
 */
export const renderVisualDocument = async (
  { name, Document }: VisualDocument,
  {
    browser,
    publicDirectory = DEFAULT_PUBLIC_DIRECTORY,
  }: RenderVisualDocumentOptions,
): Promise<RenderedPages> => {
  const html = await reactToHtmlDocument(Document);
  const pdfResult = await reactToPdf(Document, { browser, publicDirectory });
  if (isErrorObject(pdfResult)) {
    throw new Error(
      `reactToPdf failed for "${name}": ${stringifyErrorObject(pdfResult)}`,
    );
  }
  if (!(pdfResult instanceof Uint8Array)) {
    throw new TypeError(`reactToPdf returned no bytes for "${name}".`);
  }
  const docx = await reactToDocx(Document, {
    fonts: mockFonts,
    publicDirectory,
  });

  // Rendering is sequential on purpose: the renderers share one Chrome, and
  // three concurrent paginating tabs compete for the same main thread, which
  // makes wall-clock worse and page settling less predictable.
  return {
    html: await htmlToPngPages(html, { browser }),
    pdf: await pdfToPngPages(pdfResult, { browser }),
    docx: await docxToPngPages(docx, { browser }),
  };
};
