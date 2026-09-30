import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const PDFTOTEXT_PATH = '/opt/homebrew/bin/pdftotext';

/** A text line of a PDF page, in points from the page's top left corner. */
type PdfLine = {
  readonly x: number;
  readonly y: number;
  readonly text: string;
};

type PdfPage = {
  readonly width: number;
  readonly lines: ReadonlyArray<PdfLine>;
};

type LineRun = {
  readonly count: number;
  readonly first: string;
  readonly last: string;
};

type PageSummary = {
  readonly lines: LineRun;
  /** Present when any line starts in the right half of the page. */
  readonly columns?: { readonly left: LineRun; readonly right: LineRun };
};

export type PageComparison = {
  readonly pageNumber: number;
  readonly a: string;
  readonly b: string;
  /** What differs; empty when the pages match. */
  readonly differences: ReadonlyArray<string>;
};

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

const unescapeXml = (text: string) =>
  text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => {
    return XML_ENTITIES[entity] ?? entity;
  });

const PAGE_PATTERN = /<page width="([\d.]+)"[^>]*>([\s\S]*?)<\/page>/g;
const LINE_PATTERN =
  /<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">([\s\S]*?)<\/line>/g;
const WORD_PATTERN = /<word[^>]*>([^<]*)<\/word>/g;

const parseBboxLayout = (xml: string): ReadonlyArray<PdfPage> =>
  Array.from(xml.matchAll(PAGE_PATTERN), ([, width, body]) => ({
    width: Number(width),
    lines: Array.from(body.matchAll(LINE_PATTERN), ([, x, y, words]) => ({
      x: Number(x),
      y: Number(y),
      text: Array.from(words.matchAll(WORD_PATTERN), ([, word]) =>
        unescapeXml(word),
      ).join(' '),
    })),
  }));

export const readPdfPages = async (
  pdfPath: string,
): Promise<ReadonlyArray<PdfPage>> => {
  const { stdout } = await execFileAsync(
    PDFTOTEXT_PATH,
    ['-bbox-layout', pdfPath, '-'],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  return parseBboxLayout(stdout);
};

const summarizeRun = (lines: ReadonlyArray<PdfLine>): LineRun => ({
  count: lines.length,
  first: lines[0]?.text ?? '',
  last: lines.at(-1)?.text ?? '',
});

const summarizePage = ({ width, lines }: PdfPage): PageSummary => {
  const midline = width / 2;
  const right = lines.filter(({ x }) => x >= midline);
  if (right.length === 0) {
    return { lines: summarizeRun(lines) };
  }
  return {
    lines: summarizeRun(lines),
    columns: {
      left: summarizeRun(lines.filter(({ x }) => x < midline)),
      right: summarizeRun(right),
    },
  };
};

const NO_PAGE = '(no page)';

const EXCERPT_LENGTH = 24;

/** The ends are kept: a line's start and its end tell a break apart. */
const excerpt = (text: string) =>
  text.length > 2 * EXCERPT_LENGTH
    ? `${text.slice(0, EXCERPT_LENGTH)}...${text.slice(-EXCERPT_LENGTH)}`
    : text;

const describeRun = ({ count, first, last }: LineRun) =>
  `${count} [${excerpt(first)} .. ${excerpt(last)}]`;

const describeSummary = ({ lines, columns }: PageSummary) =>
  columns
    ? `L ${describeRun(columns.left)}  R ${describeRun(columns.right)}`
    : describeRun(lines);

const diffRuns = (label: string, a: LineRun, b: LineRun) => [
  ...(a.count === b.count
    ? []
    : [`${label}line count ${a.count} vs ${b.count}`]),
  ...(a.first === b.first ? [] : [`${label}first line`]),
  ...(a.last === b.last ? [] : [`${label}last line`]),
];

const diffSummaries = (a: PageSummary, b: PageSummary) => {
  if (a.columns || b.columns) {
    const noColumns = { left: summarizeRun([]), right: summarizeRun([]) };
    const columnsA = a.columns ?? noColumns;
    const columnsB = b.columns ?? noColumns;
    return [
      ...diffRuns('left column ', columnsA.left, columnsB.left),
      ...diffRuns('right column ', columnsA.right, columnsB.right),
    ];
  }
  return diffRuns('', a.lines, b.lines);
};

/**
 * Compares two renderings of one document page by page: the line count, the
 * first and last line, and for a page with columns those of each column.
 * Line positions are not compared; the text on each side of a break is what
 * shows a difference in flow.
 */
export const comparePdfPages = (
  pagesA: ReadonlyArray<PdfPage>,
  pagesB: ReadonlyArray<PdfPage>,
): ReadonlyArray<PageComparison> =>
  Array.from(
    { length: Math.max(pagesA.length, pagesB.length) },
    (_, index): PageComparison => {
      const pageA = pagesA[index];
      const pageB = pagesB[index];
      if (!pageA || !pageB) {
        return {
          pageNumber: index + 1,
          a: pageA ? describeSummary(summarizePage(pageA)) : NO_PAGE,
          b: pageB ? describeSummary(summarizePage(pageB)) : NO_PAGE,
          differences: ['page missing'],
        };
      }
      const summaryA = summarizePage(pageA);
      const summaryB = summarizePage(pageB);
      return {
        pageNumber: index + 1,
        a: describeSummary(summaryA),
        b: describeSummary(summaryB),
        differences: diffSummaries(summaryA, summaryB),
      };
    },
  );
