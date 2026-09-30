import type { ReactNode } from 'react';
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

/** A document of one masonry stack, a group of that many lines per entry. */
const createMasonryDocument = (groups: ReadonlyArray<number>) =>
  function MasonryDocument() {
    return (
      <DocumentProvider>
        <Stack margin={MARGIN} columns={COLUMNS}>
          {groups.map((lineCount, group) => (
            <MasonryGroup key={group}>
              {Array.from({ length: lineCount }, (_value, line) => (
                <Typography
                  key={line}
                  as="p"
                  lineHeight={LINE_HEIGHT}
                  marginTop="0pt"
                  marginBottom="0pt"
                >
                  {lineText(group, line)}
                </Typography>
              ))}
            </MasonryGroup>
          ))}
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

/** The first line of every group in the order the PDF draws them. */
const readPdfGroups = async (bytes: Uint8Array) => {
  const loadingTask = getDocument({ data: Uint8Array.from(bytes) });
  try {
    const pdf = await loadingTask.promise;
    const texts: Array<string> = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const { items } = await (await pdf.getPage(pageNumber)).getTextContent();
      texts.push(
        ...items.flatMap((item) =>
          'str' in item && item.str.endsWith('L00') ? [item.str] : [],
        ),
      );
    }
    return texts;
  } finally {
    await loadingTask.destroy();
  }
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

    // The PDF shows the groups in the same order.
    const pdf = await reactToPdf(Document, { browser });
    if (isErrorObject(pdf)) {
      throw new Error(stringifyErrorObject(pdf));
    }
    expect(await readPdfGroups(pdf)).toEqual(
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

  describe('refuses markup the packing cannot follow', () => {
    const render = (columnCount: 1 | 2, children: ReactNode) =>
      reactToDocx(
        function InvalidDocument() {
          return (
            <DocumentProvider>
              <Stack
                columns={{ columnCount, columnGap: '0.5in', fill: 'masonry' }}
              >
                {children}
              </Stack>
            </DocumentProvider>
          );
        },
        { browser },
      );
    const paragraph = <Typography as="p">text</Typography>;

    it('a single column', async () => {
      await expect(render(1, paragraph)).rejects.toThrow(
        'Masonry columns need a columnCount of at least 2.',
      );
    });

    it('a forced break', async () => {
      await expect(
        render(
          2,
          <>
            {paragraph}
            <Break />
          </>,
        ),
      ).rejects.toThrow(/A Break cannot be used inside masonry columns/);
    });

    it('a group that is not a direct child of the stack', async () => {
      await expect(
        render(
          2,
          <div>
            <MasonryGroup>{paragraph}</MasonryGroup>
          </div>,
        ),
      ).rejects.toThrow(/A MasonryGroup must be a direct child of a Stack/);
    });
  });
});
