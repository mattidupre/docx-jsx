import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  DocumentProvider,
  Stack,
  Table,
  TableCell,
  TableRow,
} from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { reactToDocx } from '../../reactToDocx';
import { reactToPdf } from '../../reactToPdf';
import { isErrorObject, stringifyErrorObject } from '../../utils/error';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import { mockFonts } from '../../fixtures/mockFonts';
import { findAll, inspectDocx, tables } from '../../fixtures/docxInspect';
import type * as htmlToDomModule from './htmlToDom';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type DomApi = typeof htmlToDomModule;

type TablePage = {
  /** The `<th>` text of the table on this page, empty when it has no header. */
  headerCells: ReadonlyArray<string>;
  /** One entry per body row, its cells joined. */
  bodyRows: ReadonlyArray<string>;
};

/**
 * More rows than the 10in content area of a default page can hold, so the
 * table has to break.
 */
const ROW_COUNT = 60;

const ROW_LABELS = Array.from(
  { length: ROW_COUNT },
  (_value, index) => `Row ${index + 1}`,
);

function LongTableDocument({
  fragmentation,
  repeatHeader,
}: {
  fragmentation?: 'word' | 'css';
  repeatHeader?: boolean;
}) {
  return (
    <DocumentProvider fragmentation={fragmentation}>
      <Stack>
        <Table columnWidths={[3, 1]} repeatHeader={repeatHeader}>
          <TableRow header>
            <TableCell>Chapter</TableCell>
            <TableCell align="right">Page</TableCell>
          </TableRow>
          {ROW_LABELS.map((label, index) => (
            <TableRow key={label}>
              <TableCell>{label}</TableCell>
              <TableCell align="right">{index + 1}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Stack>
    </DocumentProvider>
  );
}

/** Lines in one cell: far more than the 10in content area of a page holds. */
const TALL_ROW_LINE_COUNT = 120;

const TALL_ROW_LINES = Array.from(
  { length: TALL_ROW_LINE_COUNT },
  (_value, index) => `Line ${index + 1}`,
);

/** A row that is kept together but taller than a whole page. */
function TallRowDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Table columnWidths={[1, 1]}>
          <TableRow>
            <TableCell>
              {TALL_ROW_LINES.map((line) => (
                <p key={line} style={{ margin: 0 }}>
                  {line}
                </p>
              ))}
            </TableCell>
            <TableCell>Short</TableCell>
          </TableRow>
        </Table>
      </Stack>
    </DocumentProvider>
  );
}

/** Lines of the second cell of {@link TwoTallCellsDocument}. */
const OTHER_LINES = Array.from(
  { length: 40 },
  (_value, index) => `Other ${index + 1}`,
);

/**
 * A row with two cells taller than a page, whose lines are of different
 * heights, so no cut runs between the lines of both: each splits on its own.
 */
function TwoTallCellsDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Table columnWidths={[1, 1]}>
          <TableRow>
            <TableCell>
              {TALL_ROW_LINES.map((line) => (
                <p key={line} style={{ margin: 0, lineHeight: '17px' }}>
                  {line}
                </p>
              ))}
            </TableCell>
            <TableCell>
              {OTHER_LINES.map((line) => (
                <p key={line} style={{ margin: '0 0 6px', lineHeight: '43px' }}>
                  {line}
                </p>
              ))}
            </TableCell>
          </TableRow>
        </Table>
      </Stack>
    </DocumentProvider>
  );
}

/** The text of every page of a PDF, and where its lines are drawn. */
const readPdfPages = async (bytes: Uint8Array) => {
  const loadingTask = getDocument({ data: Uint8Array.from(bytes) });
  try {
    const pdf = await loadingTask.promise;
    const pages: Array<{
      height: number;
      items: Array<{ text: string; top: number; bottom: number }>;
    }> = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const [, , , pageHeight] = page.view;
      const { items } = await page.getTextContent();
      pages.push({
        height: pageHeight,
        items: items.flatMap((item) =>
          'str' in item && item.str.trim()
            ? [
                {
                  text: item.str,
                  // From the top of the page, in pt.
                  top: pageHeight - item.transform[5] - item.height,
                  bottom: pageHeight - item.transform[5],
                },
              ]
            : [],
        ),
      });
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
};

const readTablePages = (harness: BrowserHarness<DomApi>, html: string) =>
  harness.evaluate(async (api, pageHtml: string): Promise<TablePage[]> => {
    const pagesEl = await api.htmlToDom(pageHtml);
    // Offsets, and therefore pagination, only exist once the pages are in the
    // document.
    document.body.appendChild(pagesEl);
    try {
      return Array.from(pagesEl.children).map((pageRootEl) => {
        const tableEl = pageRootEl.querySelector('table');
        const textOf = (element: Element) =>
          (element.textContent ?? '').replace(/\s+/g, ' ').trim();
        return {
          headerCells: tableEl
            ? Array.from(tableEl.querySelectorAll('thead th')).map(textOf)
            : [],
          bodyRows: tableEl
            ? Array.from(tableEl.querySelectorAll('tbody tr')).map((rowEl) =>
                Array.from(rowEl.querySelectorAll('td')).map(textOf).join('|'),
              )
            : [],
        };
      });
    } finally {
      pagesEl.remove();
    }
  }, html);

/**
 * Per page, the text of every paragraph inside a table cell that is shown
 * whole, and how many are cut by the edge of the slice that shows them.
 */
const readVisibleCellLines = (harness: BrowserHarness<DomApi>, html: string) =>
  harness.evaluate(async (api, pageHtml: string) => {
    const pagesEl = await api.htmlToDom(pageHtml);
    document.body.appendChild(pagesEl);
    try {
      return Array.from(pagesEl.children).map((pageRootEl) => {
        const visible: Array<string> = [];
        let cut = 0;
        for (const lineEl of Array.from(pageRootEl.querySelectorAll('td p'))) {
          let clipEl = lineEl.parentElement;
          while (
            clipEl &&
            window.getComputedStyle(clipEl).overflow !== 'hidden' &&
            clipEl.tagName !== 'TD'
          ) {
            clipEl = clipEl.parentElement;
          }
          const lineRect = lineEl.getBoundingClientRect();
          const clipRect = (clipEl ?? lineEl).getBoundingClientRect();
          const top = Math.max(lineRect.top, clipRect.top);
          const bottom = Math.min(lineRect.bottom, clipRect.bottom);
          if (bottom - top >= lineRect.height - 0.5) {
            visible.push((lineEl.textContent ?? '').trim());
          } else if (bottom - top > 0.5) {
            cut += 1;
          }
        }
        return { visible, cut };
      });
    } finally {
      pagesEl.remove();
    }
  }, html);

describe('a table that spans two pages', () => {
  let browser: Browser;
  let harness: BrowserHarness<DomApi>;
  let pages: ReadonlyArray<TablePage>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<DomApi>(browser, {
      modules: ['./htmlToDom'],
      resolveDir: RESOLVE_DIR,
    });
    pages = await readTablePages(
      harness,
      reactToHtml(() => <LongTableDocument />, 'pdf'),
    );
  }, 60_000);

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  it('carries the table onto a second page', () => {
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.bodyRows.length).toBeGreaterThan(0);
    }
  });

  it('keeps every row whole and loses none of them', () => {
    const bodyRows = pages.flatMap((page) => page.bodyRows);
    // A row that broke across the page boundary would appear twice, or would
    // have lost one of its two cells.
    expect(bodyRows).toEqual(
      ROW_LABELS.map((label, index) => `${label}|${index + 1}`),
    );
  });

  it('repeats the header row at the top of every page, as Word does', () => {
    for (const page of pages) {
      expect(page.headerCells).toEqual(['Chapter', 'Page']);
    }
  });

  it('does not repeat the header row when the table turns it off', async () => {
    const unrepeated = await readTablePages(
      harness,
      reactToHtml(() => <LongTableDocument repeatHeader={false} />, 'pdf'),
    );
    expect(unrepeated.length).toBeGreaterThan(1);
    expect(unrepeated[0].headerCells).toEqual(['Chapter', 'Page']);
    for (const page of unrepeated.slice(1)) {
      expect(page.headerCells).toEqual([]);
    }
  });

  it('does not repeat the header row under the css profile', async () => {
    const cssPages = await readTablePages(
      harness,
      reactToHtml(() => <LongTableDocument fragmentation="css" />, 'pdf'),
    );
    expect(cssPages.length).toBeGreaterThan(1);
    expect(cssPages[0].headerCells).toEqual(['Chapter', 'Page']);
    for (const page of cssPages.slice(1)) {
      expect(page.headerCells).toEqual([]);
    }
    expect(cssPages.flatMap((page) => page.bodyRows)).toEqual(
      ROW_LABELS.map((label, index) => `${label}|${index + 1}`),
    );
  });

  it('splits a kept row that is taller than a page between its lines', async () => {
    const tallPages = await readVisibleCellLines(
      harness,
      reactToHtml(TallRowDocument, 'pdf'),
    );
    expect(tallPages.length).toBeGreaterThan(1);
    for (const page of tallPages) {
      expect(page.cut).toBe(0);
      expect(page.visible.length).toBeGreaterThan(0);
    }
    expect(tallPages.flatMap((page) => page.visible)).toEqual(TALL_ROW_LINES);
  });

  it('splits each cell of a tall row on its own, and draws every line once', async () => {
    const pages = await readVisibleCellLines(
      harness,
      reactToHtml(TwoTallCellsDocument, 'pdf'),
    );
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.cut).toBe(0);
    }
    const visible = pages.flatMap((page) => page.visible);
    expect(visible.filter((line) => line.startsWith('Line'))).toEqual(
      TALL_ROW_LINES,
    );
    expect(visible.filter((line) => line.startsWith('Other'))).toEqual(
      OTHER_LINES,
    );
  });

  it('puts every line of a tall row in the PDF text layer once, inside the page', async () => {
    const pdf = await reactToPdf(TwoTallCellsDocument, { browser });
    if (isErrorObject(pdf)) {
      throw new Error(stringifyErrorObject(pdf));
    }
    const pages = await readPdfPages(pdf);
    expect(pages.length).toBeGreaterThan(1);
    const texts = pages.flatMap(({ items }) => items.map(({ text }) => text));
    // Nothing is drawn twice or hidden behind a clip: each line is one text
    // item, and nothing else is.
    expect([...texts].sort()).toEqual(
      [...TALL_ROW_LINES, ...OTHER_LINES].sort(),
    );
    // The default page's 0.5in margins, with a point for rounding.
    for (const { height, items } of pages) {
      for (const { top, bottom } of items) {
        expect(top).toBeGreaterThanOrEqual(36 - 1);
        expect(bottom).toBeLessThanOrEqual(height - 36 + 1);
      }
    }
  });

  it('repeats the header row in DOCX, where Word can', async () => {
    const docx = await inspectDocx(
      await reactToDocx(() => <LongTableDocument />, { fonts: mockFonts }),
    );
    const [table] = tables(docx.document);
    // One `w:tblHeader`, on the one header row: Word repeats it at the top of
    // every page the table spans.
    expect(findAll(table, 'w:tblHeader')).toHaveLength(1);
    expect(findAll(table, 'w:tr')).toHaveLength(ROW_COUNT + 1);
  });
});
