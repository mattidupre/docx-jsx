import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import type { Browser, Page } from 'puppeteer-core';
import {
  type BinaryInput,
  type PngPage,
  SCREEN_DPI,
  readBinaryInput,
  readPngPage,
  toPngPage,
  withTimeout,
} from './entities';
import { PDFTOPPM_PATH } from './capabilities';

const execFileAsync = promisify(execFile);

const PDFJS_BUILD_DIR = join(
  dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')),
  'build',
);

/**
 * Fake origin the pdfjs bundles are served from.
 *
 * pdfjs v6 ships ESM-only bundles plus a separate worker file. Injecting them
 * as blob-URL modules works, but Chrome refuses to start a module Worker from a
 * blob on an opaque origin, so pdfjs silently falls back to its main-thread
 * "fake worker". Serving both bundles from an intercepted https origin gets the
 * real worker and is roughly twice as fast to open a document.
 */
const PDFJS_ORIGIN = 'https://pdfjs.invalid';

const DEFAULT_TIMEOUT = 60_000;

export type PdfToPngPagesOptions = {
  readonly browser: Browser;
  readonly dpi?: number;
  readonly timeout?: number;
};

type RenderedCanvasPage = {
  readonly width: number;
  readonly height: number;
  readonly dataUrl: string;
};

type PdfjsModule = {
  readonly GlobalWorkerOptions: { workerSrc: string };
  readonly getDocument: (parameters: { data: Uint8Array }) => {
    readonly promise: Promise<{
      readonly numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getViewport: (parameters: { scale: number }) => {
          readonly width: number;
          readonly height: number;
        };
        render: (parameters: Record<string, unknown>) => {
          readonly promise: Promise<void>;
        };
      }>;
    }>;
  };
};

type PdfjsWindow = Window & { pdfjs: PdfjsModule };

/**
 * A module script tag resolves its `load` event before its imports have
 * necessarily been evaluated in every Chrome build, so the global is polled
 * rather than assumed.
 */
const waitForPdfjs = async (page: Page, timeout: number): Promise<void> => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const ready = await page.evaluate(
      () => (window as unknown as Partial<PdfjsWindow>).pdfjs !== undefined,
    );
    if (ready) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `pdfToPngPages: pdfjs never initialised from ${PDFJS_ORIGIN}.`,
      );
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
  }
};

/**
 * Rasterise a PDF with pdfjs-dist on a canvas inside headless Chrome.
 *
 * At the default DPI a US Letter page renders to exactly 816x1056, matching the
 * HTML and DOCX renderers, so page size is directly comparable across targets.
 */
export const pdfToPngPages = (
  pdf: BinaryInput,
  options: PdfToPngPagesOptions,
): Promise<ReadonlyArray<PngPage>> =>
  withTimeout('pdfToPngPages', options.timeout ?? DEFAULT_TIMEOUT, () =>
    renderPdfPages(pdf, options),
  );

const renderPdfPages = async (
  pdf: BinaryInput,
  { browser, dpi = SCREEN_DPI, timeout = DEFAULT_TIMEOUT }: PdfToPngPagesOptions,
): Promise<ReadonlyArray<PngPage>> => {
  const [pdfjsSource, workerSource, pdfBytes] = await Promise.all([
    readFile(join(PDFJS_BUILD_DIR, 'pdf.min.mjs')),
    readFile(join(PDFJS_BUILD_DIR, 'pdf.worker.min.mjs')),
    readBinaryInput(pdf),
  ]);
  const assets: Record<string, Buffer> = {
    '/pdf.mjs': pdfjsSource,
    '/pdf.worker.mjs': workerSource,
  };
  const page = await browser.newPage();
  try {
    await page.bringToFront();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== PDFJS_ORIGIN) {
        void request.continue();
        return;
      }
      if (url.pathname === '/') {
        void request.respond({
          contentType: 'text/html',
          body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
        });
        return;
      }
      const asset = assets[url.pathname];
      void (asset
        ? request.respond({ contentType: 'text/javascript', body: asset })
        : request.respond({ status: 404, body: '' }));
    });
    await page.goto(`${PDFJS_ORIGIN}/`, { timeout });
    // The import has to live in a module script tag rather than in a
    // `page.evaluate` callback: vite rewrites `import()` inside this file to its
    // own SSR helper, and that helper does not exist in the browser.
    await page.addScriptTag({
      type: 'module',
      content: [
        `import * as pdfjs from '${PDFJS_ORIGIN}/pdf.mjs';`,
        `pdfjs.GlobalWorkerOptions.workerSrc = '${PDFJS_ORIGIN}/pdf.worker.mjs';`,
        'window.pdfjs = pdfjs;',
      ].join('\n'),
    });
    await waitForPdfjs(page, timeout);
    const rendered = await page.evaluate(
      async (bytes: ReadonlyArray<number>, scale: number) => {
        const { pdfjs } = window as unknown as PdfjsWindow;
        const document_ = await pdfjs.getDocument({
          data: new Uint8Array(bytes),
        }).promise;
        const pages: Array<RenderedCanvasPage> = [];
        for (
          let pageNumber = 1;
          pageNumber <= document_.numPages;
          pageNumber += 1
        ) {
          const pdfPage = await document_.getPage(pageNumber);
          const viewport = pdfPage.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Could not acquire a 2d canvas context.');
          }
          // The PDF has no background of its own; paint the sheet white so the
          // raster matches what a viewer shows.
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await pdfPage.render({ canvas, canvasContext: context, viewport })
            .promise;
          pages.push({
            width: canvas.width,
            height: canvas.height,
            dataUrl: canvas.toDataURL('image/png'),
          });
        }
        return pages;
      },
      Array.from(pdfBytes),
      dpi / 72,
    );
    if (rendered.length === 0) {
      throw new Error('pdfToPngPages: the PDF contains no pages.');
    }
    return rendered.map(({ dataUrl }, index) =>
      toPngPage(
        Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64'),
        index,
      ),
    );
  } finally {
    await page.close().catch(() => undefined);
  }
};

export type PdfToPngPagesViaPdftoppmOptions = {
  readonly dpi?: number;
  readonly pdftoppmPath?: string;
};

/**
 * Tier 2 cross-check: rasterise the same PDF with poppler instead of pdfjs.
 * One child process, no browser and no worker file, so agreement on page count
 * and page size is independent evidence that the PDF is well-formed.
 */
export const pdfToPngPagesViaPdftoppm = async (
  pdf: BinaryInput,
  {
    dpi = SCREEN_DPI,
    pdftoppmPath = PDFTOPPM_PATH,
  }: PdfToPngPagesViaPdftoppmOptions = {},
): Promise<ReadonlyArray<PngPage>> => {
  const directory = await mkdtemp(join(tmpdir(), 'matti-docs-pdf-png-'));
  try {
    const pdfPath =
      pdf instanceof Uint8Array ? join(directory, 'input.pdf') : pdf.path;
    if (pdf instanceof Uint8Array) {
      await writeFile(pdfPath, pdf);
    }
    await execFileAsync(pdftoppmPath, [
      '-r',
      String(dpi),
      '-png',
      pdfPath,
      join(directory, 'page'),
    ]);
    const names = (await readdir(directory))
      .filter((name) => name.endsWith('.png'))
      .sort();
    return await Promise.all(
      names.map((name, index) => readPngPage(join(directory, name), index)),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
