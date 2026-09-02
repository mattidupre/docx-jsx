import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { MONOSPACE_DOCX_FONT_NAME } from '../../entities';
import { mockFonts } from '../../fixtures/mockFonts';
import { reactToDocx } from '../../reactToDocx';
import {
  attribute,
  findAll,
  inspectDocx,
  paragraphs,
  textOf,
  type DocxArchive,
  type XmlNode,
  type XmlNodes,
} from '../../fixtures/docxInspect';

const NO_BREAK_SPACE = ' ';

const toDocxArchive = async (element: ReactElement): Promise<DocxArchive> =>
  inspectDocx(await reactToDocx(() => element, { fonts: mockFonts }));

const valueOfFirst = (
  root: XmlNode | XmlNodes,
  tagName: string,
  attributeName: string,
): undefined | string => {
  const [node] = findAll(root, tagName);
  return node && attribute(node, attributeName);
};

const paragraphOfText = (document: XmlNodes, text: string): XmlNode => {
  const paragraph = paragraphs(document).find((node) =>
    textOf(node).includes(text),
  );
  if (!paragraph) {
    throw new Error(`word/document.xml has no paragraph reading "${text}".`);
  }
  return paragraph;
};

/** The fonts every run of a paragraph names, in document order. */
const runFonts = (paragraph: XmlNode): ReadonlyArray<undefined | string> =>
  findAll(paragraph, 'w:rFonts').map((node) => attribute(node, 'w:ascii'));

function BlockTagsDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <blockquote>
          <p>Call me Ishmael.</p>
          <p>Some years ago.</p>
        </blockquote>
        <p>
          Run <code>npm install</code> first.
        </p>
        <pre>{'const a = 1;\n  const b = 2;'}</pre>
        <p>After.</p>
      </Stack>
    </DocumentProvider>
  );
}

describe('blockquote, pre and code in a packed DOCX', () => {
  /**
   * 40px is 30pt is 600 twips, the same inset `lib/styles.ts` writes into the
   * `blockquote` rule; 16px is 240 twips.
   */
  it('indents every paragraph of a blockquote by the quote inset', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);

    for (const text of ['Call me Ishmael.', 'Some years ago.']) {
      const quoted = paragraphOfText(document, text);
      expect(valueOfFirst(quoted, 'w:ind', 'w:left'), text).toBe('600');
      expect(valueOfFirst(quoted, 'w:ind', 'w:right'), text).toBe('600');
    }
  });

  it('gives the quote one margin box rather than one per paragraph', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);
    const first = paragraphOfText(document, 'Call me Ishmael.');
    const last = paragraphOfText(document, 'Some years ago.');

    expect(valueOfFirst(first, 'w:spacing', 'w:before')).toBe('240');
    expect(valueOfFirst(first, 'w:spacing', 'w:after')).toBeUndefined();
    expect(valueOfFirst(last, 'w:spacing', 'w:before')).toBeUndefined();
    expect(valueOfFirst(last, 'w:spacing', 'w:after')).toBe('240');
  });

  it('leaves a paragraph outside the quote unindented', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);
    expect(findAll(paragraphOfText(document, 'After.'), 'w:ind')).toHaveLength(
      0,
    );
  });

  it('sets a code run in a monospaced font and its neighbours in none', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);
    const paragraph = paragraphOfText(document, 'npm install');

    // One `w:rFonts` for the code run, none for the text around it.
    expect(runFonts(paragraph)).toEqual([MONOSPACE_DOCX_FONT_NAME]);
    expect(textOf(paragraph)).toBe('Run npm install first.');
  });

  it('keeps the spaces and the line breaks of a pre', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);
    const preformatted = paragraphOfText(document, '1;');

    // Word has no run-level "do not wrap", so the spaces that must survive are
    // written as non-breaking ones, exactly as the `nowrap` path does.
    expect(textOf(preformatted)).toBe(
      `const${NO_BREAK_SPACE}a${NO_BREAK_SPACE}=${NO_BREAK_SPACE}1;` +
        `${NO_BREAK_SPACE}${NO_BREAK_SPACE}const${NO_BREAK_SPACE}b${NO_BREAK_SPACE}=${NO_BREAK_SPACE}2;`,
    );
    // The newline is a break inside the one paragraph, not a second paragraph.
    expect(findAll(preformatted, 'w:br')).toHaveLength(1);
    expect(runFonts(preformatted)).toEqual([
      MONOSPACE_DOCX_FONT_NAME,
      MONOSPACE_DOCX_FONT_NAME,
    ]);
  });

  it('gives a pre the intrinsic block margins', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);
    const preformatted = paragraphOfText(document, '1;');

    expect(valueOfFirst(preformatted, 'w:spacing', 'w:before')).toBe('240');
    expect(valueOfFirst(preformatted, 'w:spacing', 'w:after')).toBe('240');
  });

  it('writes every block at body level, never a stray run', async () => {
    const { document } = await toDocxArchive(<BlockTagsDocument />);
    // Two quoted paragraphs, the code paragraph, the pre and the closing one.
    expect(paragraphs(document)).toHaveLength(5);
  });

  it('lets an author override the intrinsic typography of a pre', async () => {
    const { document } = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Typography as="pre" marginTop="0px" marginBottom="0px">
            tight
          </Typography>
        </Stack>
      </DocumentProvider>,
    );
    const preformatted = paragraphOfText(document, 'tight');

    expect(valueOfFirst(preformatted, 'w:spacing', 'w:before')).toBe('0');
    expect(valueOfFirst(preformatted, 'w:spacing', 'w:after')).toBe('0');
  });

  it('lets an author declare preformatted whitespace on any tag', async () => {
    const { document } = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Typography as="p" whiteSpace="pre">
            {'one\ntwo'}
          </Typography>
        </Stack>
      </DocumentProvider>,
    );
    const paragraph = paragraphOfText(document, 'one');

    expect(findAll(paragraph, 'w:br')).toHaveLength(1);
    expect(paragraphs(document)).toHaveLength(1);
  });
});
