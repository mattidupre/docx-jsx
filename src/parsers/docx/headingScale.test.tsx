import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
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

/**
 * The DOCX half of the shared heading scale: what Word actually reads out of
 * `word/styles.xml` for a plain `<h1>`..`<h6>`. The CSS half is asserted in
 * `lib/styles.test.ts`, and the single table both are built from is asserted
 * in `typographyOptionsToDocx.test.ts`.
 *
 * | style    | w:sz | w:spacing |
 * | Heading1 | 48   | 322       |
 * | Heading2 | 36   | 299       |
 * | Heading3 | 28   | 281       |
 * | Heading4 | 24   | 319       |
 * | Heading5 | 20   | 333       |
 * | Heading6 | 16   | 375       |
 */
const HEADING_STYLE_SUBJECTS = [
  ['Heading1', 48, 322],
  ['Heading2', 36, 299],
  ['Heading3', 28, 281],
  ['Heading4', 24, 319],
  ['Heading5', 20, 333],
  ['Heading6', 16, 375],
] as const satisfies ReadonlyArray<readonly [string, number, number]>;

const toDocxArchive = async (element: ReactElement): Promise<DocxArchive> =>
  inspectDocx(await reactToDocx(() => element, { fonts: mockFonts }));

const findStyle = (styles: XmlNodes, styleId: string): XmlNode => {
  const style = findAll(styles, 'w:style').find(
    (node) => attribute(node, 'w:styleId') === styleId,
  );
  if (!style) {
    throw new Error(`word/styles.xml declares no style "${styleId}".`);
  }
  return style;
};

const valueOfFirst = (
  root: XmlNode | XmlNodes,
  tagName: string,
  attributeName: string,
): undefined | string => {
  const [node] = findAll(root, tagName);
  return node && attribute(node, attributeName);
};

const paragraphOfText = (document: XmlNodes, text: string): XmlNode => {
  const paragraph = paragraphs(document).find(
    (node) => textOf(node).trim() === text,
  );
  if (!paragraph) {
    throw new Error(`word/document.xml has no paragraph reading "${text}".`);
  }
  return paragraph;
};

function HeadingsDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <h5>Heading 5</h5>
        <h6>Heading 6</h6>
        <p>Body</p>
      </Stack>
    </DocumentProvider>
  );
}

describe('the intrinsic heading scale in a packed DOCX', () => {
  for (const [styleId, size, spacing] of HEADING_STYLE_SUBJECTS) {
    it(`sizes ${styleId} at w:sz ${size} with ${spacing} twips of spacing`, async () => {
      const { styles } = await toDocxArchive(<HeadingsDocument />);
      const style = findStyle(styles, styleId);

      expect(valueOfFirst(style, 'w:sz', 'w:val')).toBe(String(size));
      expect(valueOfFirst(style, 'w:b', 'w:val')).toBeUndefined();
      expect(findAll(style, 'w:b')).toHaveLength(1);
      expect(valueOfFirst(style, 'w:spacing', 'w:before')).toBe(
        String(spacing),
      );
      expect(valueOfFirst(style, 'w:spacing', 'w:after')).toBe(String(spacing));
    });
  }

  it('leaves the sizing to the style rather than to the runs', async () => {
    const { document } = await toDocxArchive(<HeadingsDocument />);
    const heading = paragraphOfText(document, 'Heading 2');

    expect(valueOfFirst(heading, 'w:pStyle', 'w:val')).toBe('Heading2');
    // Direct run formatting would beat any character style an author applies.
    expect(findAll(heading, 'w:sz')).toHaveLength(0);
  });

  it('does not size a paragraph that is not a heading', async () => {
    const { document } = await toDocxArchive(<HeadingsDocument />);
    const body = paragraphOfText(document, 'Body');

    expect(findAll(body, 'w:pStyle')).toHaveLength(0);
    expect(findAll(body, 'w:sz')).toHaveLength(0);
    expect(findAll(body, 'w:spacing')).toHaveLength(0);
  });

  it('lets a variant override the scale of the tag it is applied to', async () => {
    const { document, styles } = await toDocxArchive(
      <DocumentProvider variants={{ heading2: { fontSize: '3rem' } }}>
        <Stack>
          <h2>Bigger</h2>
          <Typography as="h2" variant="heading1">
            Heading one on an h2
          </Typography>
        </Stack>
      </DocumentProvider>,
    );

    // 3rem == 36pt == 72 half points, replacing the intrinsic 36.
    expect(valueOfFirst(findStyle(styles, 'Heading2'), 'w:sz', 'w:val')).toBe(
      '72',
    );
    // The intrinsic h2 margin survives, because the variant never declared one.
    expect(
      valueOfFirst(findStyle(styles, 'Heading2'), 'w:spacing', 'w:before'),
    ).toBe('299');

    // An explicit variant wins over the tag, so this paragraph is a Heading1.
    expect(
      valueOfFirst(
        paragraphOfText(document, 'Heading one on an h2'),
        'w:pStyle',
        'w:val',
      ),
    ).toBe('Heading1');
  });
});
