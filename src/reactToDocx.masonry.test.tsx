import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Browser } from 'puppeteer-core';
import {
  Break,
  DocumentProvider,
  MasonryGroup,
  Stack,
  Typography,
} from './reactComponents';
import { reactToDocx } from './reactToDocx';
import { reactToPdf } from './reactToPdf';
import { closeTestBrowser, launchTestBrowser } from './fixtures/browser';
import {
  attribute,
  findAll,
  inspectDocx,
  paragraphs,
  textOf,
  type XmlNode,
} from './fixtures/docxInspect';
import { isErrorObject, stringifyErrorObject } from './utils/error';

/**
 * 18pt lines on a 9in column: 36 of them fill it exactly, in both targets.
 */
const LINE_HEIGHT = '18pt';

const COLUMNS = {
  columnCount: 2,
  columnGap: '0.5in',
  fill: 'masonry',
} as const;

const MARGIN = {
  top: '1in',
  right: '1in',
  bottom: '1in',
  left: '1in',
} as const;

const lineText = (group: number, line: number) =>
  `G${group} L${String(line).padStart(2, '0')}`;

const lines = (group: number, from: number, count: number) =>
  Array.from({ length: count }, (_value, index) => (
    <Typography
      key={from + index}
      as="p"
      lineHeight={LINE_HEIGHT}
      marginTop="0pt"
      marginBottom="0pt"
    >
      {lineText(group, from + index)}
    </Typography>
  ));

/**
 * A masonry stack's children: a group of that many lines per number, a
 * Break for `break`, and for an array a group of that many lines with a
 * Break between each two runs of them.
 */
type MasonryEntry = number | 'break' | ReadonlyArray<number>;

/** A document of one masonry stack of `columnCount` columns. */
const createMasonryDocument = (
  entries: ReadonlyArray<MasonryEntry>,
  columnCount: 1 | 2 = 2,
) =>
  function MasonryDocument() {
    let group = -1;
    return (
      <DocumentProvider>
        <Stack margin={MARGIN} columns={{ ...COLUMNS, columnCount }}>
          {entries.map((entry, index) => {
            if (entry === 'break') {
              return <Break key={index} />;
            }
            group += 1;
            const runs = typeof entry === 'number' ? [entry] : entry;
            return (
              <MasonryGroup key={index}>
                {runs.flatMap((count, run) => {
                  const from = runs
                    .slice(0, run)
                    .reduce((sum, value) => sum + value, 0);
                  return [
                    ...(run > 0 ? [<Break key={`break${run}`} />] : []),
                    ...lines(group, from, count),
                  ];
                })}
              </MasonryGroup>
            );
          })}
        </Stack>
      </DocumentProvider>
    );
  };

/** The first line of every group in DOCX order, and every break between. */
const readDocxFlow = async (buffer: Uint8Array) => {
  const { document } = await inspectDocx(buffer);
  const body = findAll(document, 'w:body');
  return paragraphs(body).flatMap((paragraph: XmlNode) => {
    const text = textOf(paragraph);
    const breaks = findAll(paragraph, 'w:br').map(
      (docxBreak) => `<${attribute(docxBreak, 'w:type') ?? 'line'}>`,
    );
    return [...(text.endsWith('L00') ? [text] : []), ...breaks];
  });
};

/** Every line of the PDF, page by page, with the left edge it starts at. */
const readPdfLines = async (bytes: Uint8Array) => {
  const loadingTask = getDocument({ data: Uint8Array.from(bytes) });
  try {
    const pdf = await loadingTask.promise;
    const pages: Array<Array<{ text: string; x: number }>> = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const { items } = await (await pdf.getPage(pageNumber)).getTextContent();
      pages.push(
        items.flatMap((item) =>
          'str' in item && /^G\d+ L\d+$/.test(item.str)
            ? [{ text: item.str, x: Math.round(item.transform[4]) }]
            : [],
        ),
      );
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
};

/** The first line of every group in the order the PDF draws them. */
const readPdfGroups = async (bytes: Uint8Array) =>
  (await readPdfLines(bytes))
    .flat()
    .flatMap(({ text }) => (text.endsWith('L00') ? [text] : []));

const renderPdf = async (
  Document: ReturnType<typeof createMasonryDocument>,
  browser: Browser,
) => {
  const pdf = await reactToPdf(Document, { browser });
  if (isErrorObject(pdf)) {
    throw new Error(stringifyErrorObject(pdf));
  }
  return pdf;
};

describe('reactToDocx with masonry columns', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchTestBrowser();
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
  });

  it('writes the units in packed order, with breaks where the columns and pages end', async () => {
    // Page 1: G0 and G1 fill the tops of the columns; G2 fits in neither
    // column after them, so G3 and G4 go ahead of it. Page 2: G2.
    const Document = createMasonryDocument([20, 30, 20, 10, 5]);
    const docx = await reactToDocx(Document, { browser });

    expect(await readDocxFlow(docx)).toEqual([
      lineText(0, 0),
      lineText(3, 0),
      lineText(4, 0),
      '<column>',
      lineText(1, 0),
      '<page>',
      lineText(2, 0),
    ]);

    // A column break has a one twip paragraph of its own: ending a text
    // paragraph with it would carry that paragraph's mark into the next
    // column as an empty line.
    const { document } = await inspectDocx(docx);
    const [columnBreakParagraph] = paragraphs(
      findAll(document, 'w:body'),
    ).filter((paragraph: XmlNode) =>
      findAll(paragraph, 'w:br').some(
        (docxBreak) => attribute(docxBreak, 'w:type') === 'column',
      ),
    );
    expect(textOf(columnBreakParagraph)).toBe('');
    expect(
      attribute(findAll(columnBreakParagraph, 'w:spacing')[0], 'w:line'),
    ).toBe('1');

    // The PDF shows the groups in the same order.
    expect(await readPdfGroups(await renderPdf(Document, browser))).toEqual(
      [0, 3, 4, 1, 2].map((group) => lineText(group, 0)),
    );
  });

  it('lets a unit taller than a column flow on by itself', async () => {
    const docx = await reactToDocx(createMasonryDocument([3, 40]), {
      browser,
    });

    expect(await readDocxFlow(docx)).toEqual([lineText(0, 0), lineText(1, 0)]);
  });

  it('does not balance a masonry section again in Word', async () => {
    const { document } = await inspectDocx(
      await reactToDocx(createMasonryDocument([2, 2]), { browser }),
    );

    // One section: no continuous carrier after the columns.
    expect(findAll(document, 'w:sectPr')).toHaveLength(1);
  });

  it('needs a browser for a document with masonry columns', async () => {
    await expect(
      reactToDocx(createMasonryDocument([2, 2]), {}),
    ).rejects.toThrow(/masonry columns.*Pass a `browser` to `reactToDocx`/);
  });

  it('packs a single column in order, with the lookahead', async () => {
    // G1 does not fit under G0, so G2 goes ahead of it.
    const Document = createMasonryDocument([20, 30, 10], 1);
    const docx = await reactToDocx(Document, { browser });

    expect(await readDocxFlow(docx)).toEqual([
      lineText(0, 0),
      lineText(2, 0),
      '<page>',
      lineText(1, 0),
    ]);
    const { document } = await inspectDocx(docx);
    expect(findAll(document, 'w:cols')).toHaveLength(0);
    expect(await readPdfGroups(await renderPdf(Document, browser))).toEqual(
      [0, 2, 1].map((group) => lineText(group, 0)),
    );
  });

  it('moves on to the next column at a Break between units', async () => {
    const Document = createMasonryDocument([5, 'break', 5, 5]);
    const docx = await reactToDocx(Document, { browser });

    // The Break writes nothing itself: the packing writes the column break.
    expect(await readDocxFlow(docx)).toEqual([
      lineText(0, 0),
      '<column>',
      lineText(1, 0),
      lineText(2, 0),
    ]);
    const [page] = await readPdfLines(await renderPdf(Document, browser));
    const leftOf = (group: number) =>
      page.find(({ text }) => text === lineText(group, 0))?.x ?? 0;
    // G1 and G2 share the right column, though the left one is shorter.
    expect(leftOf(1)).toBeGreaterThan(leftOf(0));
    expect(leftOf(2)).toBe(leftOf(1));
  });

  it('starts the next page at a Break between units in a single column', async () => {
    const Document = createMasonryDocument([5, 'break', 5], 1);

    expect(
      await readDocxFlow(await reactToDocx(Document, { browser })),
    ).toEqual([lineText(0, 0), '<page>', lineText(1, 0)]);
    expect(
      (await readPdfLines(await renderPdf(Document, browser))).map((page) =>
        page.map(({ text }) => text).filter((text) => text.endsWith('L00')),
      ),
    ).toEqual([[lineText(0, 0)], [lineText(1, 0)]]);
  });

  it('carries the rest of a unit to the next column at a Break inside it', async () => {
    const Document = createMasonryDocument([[3, 2], 4]);
    const docx = await reactToDocx(Document, { browser });

    // Word breaks the unit itself, at a one twip paragraph of its own.
    expect(await readDocxFlow(docx)).toEqual([
      lineText(0, 0),
      '<column>',
      lineText(1, 0),
    ]);
    const [page] = await readPdfLines(await renderPdf(Document, browser));
    const leftOf = (text: string) =>
      page.find((line) => line.text === text)?.x ?? 0;
    expect(leftOf(lineText(0, 3))).toBeGreaterThan(leftOf(lineText(0, 2)));
    expect(leftOf(lineText(1, 0))).toBe(leftOf(lineText(0, 3)));
  });

  it('packs no unit for a bare line break or whitespace between units', async () => {
    const Document = function Document() {
      return (
        <DocumentProvider>
          <Stack margin={MARGIN} columns={COLUMNS}>
            <MasonryGroup>{lines(0, 0, 2)}</MasonryGroup> <br />
            {'  '}
            <MasonryGroup>{lines(1, 0, 2)}</MasonryGroup>
            {'\n'}
          </Stack>
        </DocumentProvider>
      );
    };

    expect(
      await readDocxFlow(await reactToDocx(Document, { browser })),
    ).toEqual([lineText(0, 0), '<column>', lineText(1, 0)]);
    expect(await readPdfGroups(await renderPdf(Document, browser))).toEqual([
      lineText(0, 0),
      lineText(1, 0),
    ]);
  });

  it('refuses a group that is not a direct child of the stack', async () => {
    await expect(
      reactToDocx(
        function InvalidDocument() {
          return (
            <DocumentProvider>
              <Stack columns={COLUMNS}>
                <div>
                  <MasonryGroup>
                    <Typography as="p">text</Typography>
                  </MasonryGroup>
                </div>
              </Stack>
            </DocumentProvider>
          );
        },
        { browser },
      ),
    ).rejects.toThrow(/A MasonryGroup must be a direct child of a Stack/);
  });
});
