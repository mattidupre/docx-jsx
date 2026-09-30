import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import {
  DocumentProvider,
  Stack,
  Table,
  TableCell,
  TableRow,
} from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { reactToDocx } from '../../reactToDocx';
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
