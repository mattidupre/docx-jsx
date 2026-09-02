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

function LongTableDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Table columnWidths={[3, 1]}>
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
                Array.from(rowEl.querySelectorAll('td'))
                  .map(textOf)
                  .join('|'),
              )
            : [],
        };
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
      reactToHtml(LongTableDocument, 'pdf'),
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

  it('does not repeat the header row, which pagedjs 0.4 cannot do', () => {
    // pagedjs rebuilds the ancestors of the node it broke at with
    // `cloneNode(false)`, so the continuation table on page two is created
    // without the `<thead>` that page one carries. There is no hook in
    // pagedjs 0.4.3 that repeats it, so header repetition is DOCX only and
    // this test pins the gap rather than asserting the behaviour we want.
    expect(pages[0].headerCells).toEqual(['Chapter', 'Page']);
    for (const page of pages.slice(1)) {
      expect(page.headerCells).toEqual([]);
    }
  });

  it('repeats the header row in DOCX, where Word can', async () => {
    const docx = await inspectDocx(
      await reactToDocx(LongTableDocument, { fonts: mockFonts }),
    );
    const [table] = tables(docx.document);
    // One `w:tblHeader`, on the one header row: Word repeats it at the top of
    // every page the table spans.
    expect(findAll(table, 'w:tblHeader')).toHaveLength(1);
    expect(findAll(table, 'w:tr')).toHaveLength(ROW_COUNT + 1);
  });
});
