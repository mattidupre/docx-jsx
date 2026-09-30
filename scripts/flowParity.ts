/**
 * Flow parity check between the Chrome PDF and Word's rendering. Manual, not CI.
 *
 *   pnpm exec vite-node scripts/flowParity.ts [--font arial.ttf] [--out dir]
 *     [--only flow,breaks,columns,trim,masonry] [--word word.pdf]
 *   pnpm exec vite-node scripts/flowParity.ts --compare first.pdf second.pdf
 *
 * Without `--word` it writes the probe DOCX and the Chrome PDF to the output
 * directory. The DOCX holds every probe (S1-S5 flow, T1-T6 break rules, the
 * column cases, U1-U4 trimmed text and the M1-M14 masonry groups), so it is
 * opened in Word once:
 *
 *   1. Copy the DOCX into ~/Library/Containers/com.microsoft.Word/Data/Documents/
 *      (the sandbox Word can read).
 *   2. Open it in Word, then File > Print > PDF > Save as PDF.
 *   3. Run this script again with `--word <that pdf>`.
 *
 * With `--word` it also compares the two PDFs with `pdftotext -bbox-layout`
 * (poppler): per page the line count and the first and last line, and for a
 * page with columns those of the left and right column. It prints the pages
 * that differ and exits 1 when there are any.
 *
 * The probes use Word's Arial. The font file stays out of the repository: pass
 * `--font` or set FLOW_PARITY_ARIAL, else Word's bundled copy is used.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { closeTestBrowser, launchTestBrowser } from '../src/fixtures/browser';
import {
  FLOW_PARITY_FONT_SRC,
  FLOW_PARITY_FONTS,
  FLOW_PARITY_SECTIONS,
  createFlowParityDocument,
  type FlowParitySection,
} from '../src/fixtures/flowParity';
import {
  comparePdfPages,
  readPdfPages,
} from '../src/fixtures/flowParity/comparePdfs';
import { reactToDocx } from '../src/reactToDocx';
import { reactToPdf } from '../src/reactToPdf';

const DEFAULT_FONT_PATH =
  '/Applications/Microsoft Word.app/Contents/Resources/DFonts/arial.ttf';

const DEFAULT_OUT_DIRECTORY = path.join(os.tmpdir(), 'matti-docs-flow-parity');

const isSection = (value: string): value is FlowParitySection =>
  FLOW_PARITY_SECTIONS.some((section) => section === value);

const parseSections = (
  value: undefined | string,
): ReadonlyArray<FlowParitySection> => {
  if (value === undefined) {
    return FLOW_PARITY_SECTIONS;
  }
  return value.split(',').map((section) => {
    if (!isSection(section)) {
      throw new Error(
        `Unknown section "${section}"; use ${FLOW_PARITY_SECTIONS.join(', ')}.`,
      );
    }
    return section;
  });
};

const printComparison = async (
  labelA: string,
  pathA: string,
  labelB: string,
  pathB: string,
): Promise<number> => {
  const comparisons = comparePdfPages(
    await readPdfPages(pathA),
    await readPdfPages(pathB),
  );
  const mismatched = comparisons.filter(
    ({ differences }) => differences.length > 0,
  );
  for (const { pageNumber, a, b, differences } of comparisons) {
    if (differences.length === 0) {
      console.info(`   p${pageNumber} ${a}`);
    } else {
      console.info(
        `!! p${pageNumber} ${differences.join(', ')}\n     ${labelA}: ${a}\n     ${labelB}: ${b}`,
      );
    }
  }
  console.info(
    `${mismatched.length} of ${comparisons.length} pages differ (${labelA} vs ${labelB}).`,
  );
  return mismatched.length;
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    font: { type: 'string' },
    out: { type: 'string' },
    only: { type: 'string' },
    word: { type: 'string' },
    compare: { type: 'boolean' },
  },
});

if (values.compare) {
  const [first, second] = positionals;
  if (!first || !second) {
    throw new Error('--compare takes two PDF paths.');
  }
  const differing = await printComparison(
    path.basename(first),
    first,
    path.basename(second),
    second,
  );
  process.exitCode = differing > 0 ? 1 : 0;
} else {
  const fontPath =
    values.font ?? process.env['FLOW_PARITY_ARIAL'] ?? DEFAULT_FONT_PATH;
  const outDirectory = path.resolve(values.out ?? DEFAULT_OUT_DIRECTORY);
  const publicDirectory = path.join(outDirectory, 'public');
  const docxPath = path.join(outDirectory, 'flow-parity.docx');
  const chromePdfPath = path.join(outDirectory, 'flow-parity-chrome.pdf');

  const Document = createFlowParityDocument(parseSections(values.only));

  await mkdir(publicDirectory, { recursive: true });
  await copyFile(fontPath, path.join(publicDirectory, FLOW_PARITY_FONT_SRC));

  const browser = await launchTestBrowser();
  try {
    // Both targets read Arial's metrics from the same file: the line model
    // (`normal`, trimmed text) is resolved from them. The masonry probe is
    // laid out in the browser first, so the DOCX packs it as the PDF does.
    await writeFile(
      docxPath,
      await reactToDocx(Document, {
        browser,
        fonts: FLOW_PARITY_FONTS,
        publicDirectory,
      }),
    );
    console.info(`Word: ${docxPath}`);

    const pdf = await reactToPdf(Document, {
      browser,
      publicDirectory,
      fonts: FLOW_PARITY_FONTS,
    });
    if (!(pdf instanceof Uint8Array)) {
      throw new Error(`Cannot render the PDF: ${JSON.stringify(pdf)}`);
    }
    await writeFile(chromePdfPath, pdf);
    console.info(`Chrome: ${chromePdfPath}`);
  } finally {
    await closeTestBrowser(browser);
  }

  if (values.word) {
    const differing = await printComparison(
      'word',
      values.word,
      'chrome',
      chromePdfPath,
    );
    process.exitCode = differing > 0 ? 1 : 0;
  }
}
