import { createRequire } from 'node:module';
import type { Browser, Page } from 'puppeteer-core';
import {
  type BinaryInput,
  type PngPage,
  readBinaryInput,
  toPngPage,
  withTimeout,
} from './entities';

const require_ = createRequire(import.meta.url);

/** UMD builds; docx-preview declares jszip external and reads it as a global. */
const JSZIP_UMD_PATH = require_.resolve('jszip/dist/jszip.min.js');

const DOCX_PREVIEW_UMD_PATH = require_.resolve('docx-preview');

/** Neutralise docx-preview's page chrome (shadow, margins) for pixel comparison. */
const CAPTURE_CSS = `
  html, body { margin: 0; padding: 0; background: #fff; }
  .docx-wrapper { background: #fff !important; padding: 0 !important; }
  .docx-wrapper > section.docx {
    box-shadow: none !important;
    margin: 0 !important;
    background: #fff !important;
  }
`;

/**
 * `tiles` slices each rendered section into sheet-height strips, so the output
 * is page-like even though docx-preview does not reflow content across sheets.
 * `sections` returns the raw, variable-height sections instead.
 */
export type DocxPagination = 'tiles' | 'sections';

const DEFAULT_TIMEOUT = 60_000;

export type DocxToPngPagesOptions = {
  readonly browser: Browser;
  readonly deviceScaleFactor?: number;
  readonly timeout?: number;
  readonly paginate?: DocxPagination;
};

type SheetBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly sectionOverflow: boolean;
};

type DocxPreviewGlobal = {
  readonly renderAsync: (
    data: Blob,
    bodyContainer: HTMLElement,
    styleContainer: null,
    options: Record<string, boolean | string>,
  ) => Promise<void>;
};

type DocxPreviewWindow = Window & { readonly docx: DocxPreviewGlobal };

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * The `className` docx-preview is asked to use. Every selector below is derived
 * from it, so the string exists once.
 */
const DOCX_CLASS_NAME = 'docx';

const SECTION_SELECTOR = `.${DOCX_CLASS_NAME}-wrapper > section.${DOCX_CLASS_NAME}`;

/**
 * docx-preview positions tab stops only after `renderAsync` has resolved, from
 * a 500ms `setTimeout` in its own `refreshTabStops` (docx-preview 0.4.0,
 * guarded by `experimental`). A screenshot taken before it fires shows every
 * `w:tab` as a single space, which is neither what the file says nor what Word
 * draws.
 *
 * That pass is waited for by observation rather than by sleeping past it: it
 * sets `wordSpacing` on each tab span in one synchronous loop, so the first
 * span to have a `wordSpacing` proves the whole pass has run. A document with
 * no tab spans waits not at all, which is most of them.
 */
const TAB_STOP_SELECTOR = `.${DOCX_CLASS_NAME}-tab-stop`;

const TAB_STOP_TIMEOUT_MS = 2_000;

const TAB_STOP_POLL_INTERVAL_MS = 25;

/**
 * `updateTabStop` bails out without setting a width when a tab has no stop to
 * its right, so a document whose only tab is unpositionable would never satisfy
 * the condition. The deadline gives up and screenshots what is there instead of
 * failing the render over a tab that was never going to move.
 */
const waitForTabStops = async (page: Page): Promise<void> => {
  const deadline = Date.now() + TAB_STOP_TIMEOUT_MS;
  for (;;) {
    const positioned = await page.evaluate((selector: string) => {
      const spans = [...document.querySelectorAll(selector)];
      return (
        spans.length === 0 ||
        spans.some(
          (span) =>
            span instanceof HTMLElement && span.style.wordSpacing !== '',
        )
      );
    }, TAB_STOP_SELECTOR);
    if (positioned || Date.now() > deadline) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, TAB_STOP_POLL_INTERVAL_MS);
    });
  }
};

/**
 * Rasterise a .docx to one PNG per sheet using docx-preview inside headless
 * Chrome. docx-preview lays the document out in a browser: it is a browser
 * approximation of Word's layout, not Word itself. It is nonetheless the only
 * DOCX renderer available here, because this machine's Word build does not
 * implement the AppleScript commands needed to drive it (see `probeWord`).
 */
export const docxToPngPages = (
  docx: BinaryInput,
  options: DocxToPngPagesOptions,
): Promise<ReadonlyArray<PngPage>> =>
  withTimeout('docxToPngPages', options.timeout ?? DEFAULT_TIMEOUT, () =>
    renderDocxPages(docx, options),
  );

const renderDocxPages = async (
  docx: BinaryInput,
  {
    browser,
    deviceScaleFactor = 1,
    timeout = DEFAULT_TIMEOUT,
    paginate = 'tiles',
  }: DocxToPngPagesOptions,
): Promise<ReadonlyArray<PngPage>> => {
  const bytes = await readBinaryInput(docx);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor });
    // Screenshots of a backgrounded tab can stall; the tab is only ever brought
    // forward, never left behind another one.
    await page.bringToFront();
    await page.setContent(
      '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="container"></div></body></html>',
      { waitUntil: 'domcontentloaded', timeout },
    );
    await page.addScriptTag({ path: JSZIP_UMD_PATH });
    await page.addScriptTag({ path: DOCX_PREVIEW_UMD_PATH });
    await page.addStyleTag({ content: CAPTURE_CSS });

    const sectionCount = await page.evaluate(
      async (
        data: ReadonlyArray<number>,
        mimeType: string,
        className: string,
        sectionSelector: string,
      ) => {
        const container = document.getElementById('container');
        if (!container) {
          throw new Error('The render container is missing.');
        }
        const blob = new Blob([new Uint8Array(data)], { type: mimeType });
        await (window as unknown as DocxPreviewWindow).docx.renderAsync(
          blob,
          container,
          null,
          {
            className,
            inWrapper: true,
            breakPages: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            renderChanges: false,
            experimental: true,
            useBase64URL: true,
          },
        );
        await document.fonts.ready;
        return document.querySelectorAll(sectionSelector).length;
      },
      Array.from(bytes),
      DOCX_MIME_TYPE,
      DOCX_CLASS_NAME,
      SECTION_SELECTOR,
    );
    if (sectionCount === 0) {
      throw new Error(
        'docxToPngPages: docx-preview produced no page sections.',
      );
    }
    await waitForTabStops(page);

    const boxes = await page.evaluate(
      (mode: string, sectionSelector: string) => {
        const sections = [...document.querySelectorAll(sectionSelector)];
        const sheets: Array<SheetBox> = [];
        for (const section of sections) {
          const rect = section.getBoundingClientRect();
          const sheetHeight = Number.parseFloat(
            getComputedStyle(section).minHeight,
          );
          const x = rect.left + window.scrollX;
          const y = rect.top + window.scrollY;
          if (
            mode !== 'tiles' ||
            !Number.isFinite(sheetHeight) ||
            sheetHeight <= 0
          ) {
            sheets.push({
              x,
              y,
              width: rect.width,
              height: rect.height,
              sectionOverflow: false,
            });
            continue;
          }
          const tiles = Math.max(1, Math.ceil(rect.height / sheetHeight));
          for (let tile = 0; tile < tiles; tile += 1) {
            // Every tile is a full sheet, including the last: a short final tile
            // would make page size an artefact of how much content happened to
            // be left over rather than a property of the page.
            sheets.push({
              x,
              y: y + tile * sheetHeight,
              width: rect.width,
              height: sheetHeight,
              sectionOverflow: tiles > 1,
            });
          }
        }
        // The last sheet can extend past the rendered content; grow the document
        // so the clip region always exists and is painted white.
        const bottom = sheets.reduce(
          (max, sheet) => Math.max(max, sheet.y + sheet.height),
          0,
        );
        document.body.style.minHeight = `${Math.ceil(bottom)}px`;
        return sheets;
      },
      paginate,
      SECTION_SELECTOR,
    );

    const degenerate = boxes.find(
      (box) => Math.round(box.width) < 1 || Math.round(box.height) < 1,
    );
    if (degenerate) {
      throw new Error(
        `docxToPngPages: a rendered sheet measured ${Math.round(degenerate.width)}x${Math.round(degenerate.height)}. ` +
          'This is what docx-preview produces when `w:pgSz`/`w:pgMar` carry CSS lengths (for example `8.5in`) instead of integer twips.',
      );
    }

    const pages: Array<PngPage> = [];
    for (const [index, box] of boxes.entries()) {
      const buffer = await page.screenshot({
        type: 'png',
        captureBeyondViewport: true,
        clip: {
          x: box.x,
          y: box.y,
          width: Math.round(box.width),
          height: Math.round(box.height),
        },
      });
      pages.push(toPngPage(Buffer.from(buffer), index));
    }
    return pages;
  } finally {
    await page.close().catch(() => undefined);
  }
};
