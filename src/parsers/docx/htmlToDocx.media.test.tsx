import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Divider,
  DocumentProvider,
  Image,
  Spacer,
  Stack,
} from '../../reactComponents';
import { mockFonts } from '../../fixtures/mockFonts';
import {
  MOCK_IMAGE_DATA_URL,
  MOCK_IMAGE_FILE_NAME,
  MOCK_IMAGE_INTRINSIC_HEIGHT,
  MOCK_IMAGE_INTRINSIC_WIDTH,
} from '../../fixtures/mockImage';
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
import type { HtmlToDocxOptions } from './htmlToDocx';

const SOURCE_IMAGE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'mockAssets',
  MOCK_IMAGE_FILE_NAME,
);

/** The file is nested so a pass can only mean `publicDirectory` was joined on. */
const SERVED_IMAGE_SRC = `/nested/${MOCK_IMAGE_FILE_NAME}`;

/** The picture parts themselves, not the `word/media/` directory entry. */
const MEDIA_PATH_EXP = /^word\/media\/.+/;

const PAGE_SIZE = { width: '8.5in', height: '11in' } as const;

const PAGE_MARGIN = {
  top: '1in',
  right: '1in',
  bottom: '1in',
  left: '1in',
  header: '0.5in',
  footer: '0.5in',
} as const;

const CONTENT_WIDTH_TWIP = 9360; // 8.5in - 1in - 1in, in twips.

const toDocxBytes = (
  element: ReactElement,
  options: Omit<HtmlToDocxOptions, 'fonts'> = {},
): Promise<Uint8Array> =>
  reactToDocx(() => element, { fonts: mockFonts, ...options });

const toDocxArchive = async (
  element: ReactElement,
  options: Omit<HtmlToDocxOptions, 'fonts'> = {},
): Promise<DocxArchive> => inspectDocx(await toDocxBytes(element, options));

const withPage = (children: ReactElement) => (
  <DocumentProvider size={PAGE_SIZE}>
    <Stack margin={PAGE_MARGIN}>{children}</Stack>
  </DocumentProvider>
);

/**
 * `w:extent` on a drawing is in EMUs, which is what `docx` converts its pixel
 * transformation into. 914400 EMU is an inch, so a pixel is 9525.
 */
const EMU_PER_PX = 9525;

const drawingExtents = (root: XmlNode | XmlNodes) =>
  findAll(root, 'wp:extent').map((extent) => ({
    width: Number(attribute(extent, 'cx')) / EMU_PER_PX,
    height: Number(attribute(extent, 'cy')) / EMU_PER_PX,
  }));

const spacingOf = (paragraph: XmlNode) => {
  const [spacing] = findAll(paragraph, 'w:spacing');
  return {
    before: attribute(spacing, 'w:before'),
    after: attribute(spacing, 'w:after'),
    line: attribute(spacing, 'w:line'),
    lineRule: attribute(spacing, 'w:lineRule'),
  };
};

const bottomBorderOf = (paragraph: XmlNode) => {
  const [border] = findAll(paragraph, 'w:bottom');
  return {
    style: attribute(border, 'w:val'),
    size: attribute(border, 'w:sz'),
    color: attribute(border, 'w:color'),
  };
};

describe('Image', () => {
  let publicDirectory: string;

  beforeAll(async () => {
    publicDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'matti-docs-images-'),
    );
    await fs.mkdir(path.join(publicDirectory, 'nested'));
    await fs.copyFile(
      SOURCE_IMAGE_PATH,
      path.join(publicDirectory, SERVED_IMAGE_SRC),
    );
  });

  afterAll(async () => {
    if (publicDirectory) {
      await fs.rm(publicDirectory, { recursive: true, force: true });
    }
  });

  it('embeds the bytes of a data URL as a picture part', async () => {
    const docx = await toDocxArchive(
      withPage(<Image src={MOCK_IMAGE_DATA_URL} alt="Swatch" width="1in" />),
    );

    expect(
      docx.fileNames.filter((fileName) => MEDIA_PATH_EXP.test(fileName)),
    ).toHaveLength(1);
    expect(findAll(docx.document, 'w:drawing')).toHaveLength(1);
  });

  it('reads the bytes of a path from publicDirectory', async () => {
    const docx = await toDocxArchive(
      withPage(<Image src={SERVED_IMAGE_SRC} alt="Swatch" width="1in" />),
      { publicDirectory },
    );

    expect(
      docx.fileNames.filter((fileName) => MEDIA_PATH_EXP.test(fileName)),
    ).toHaveLength(1);
  });

  it('reads the bytes of an absolute path', async () => {
    const docx = await toDocxArchive(
      withPage(<Image src={SOURCE_IMAGE_PATH} alt="Swatch" width="1in" />),
    );

    expect(
      docx.fileNames.filter((fileName) => MEDIA_PATH_EXP.test(fileName)),
    ).toHaveLength(1);
  });

  it('sizes the picture in pixels at 96 DPI', async () => {
    const docx = await toDocxArchive(
      withPage(
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Swatch"
          width="1in"
          height="0.5in"
        />,
      ),
    );

    expect(drawingExtents(docx.document)).toEqual([{ width: 96, height: 48 }]);
  });

  it('derives the missing axis from the intrinsic size', async () => {
    const aspectRatio =
      MOCK_IMAGE_INTRINSIC_WIDTH / MOCK_IMAGE_INTRINSIC_HEIGHT;

    const fromWidth = await toDocxArchive(
      withPage(<Image src={MOCK_IMAGE_DATA_URL} alt="Swatch" width="192px" />),
    );
    expect(drawingExtents(fromWidth.document)).toEqual([
      { width: 192, height: 192 / aspectRatio },
    ]);

    const fromHeight = await toDocxArchive(
      withPage(<Image src={MOCK_IMAGE_DATA_URL} alt="Swatch" height="64px" />),
    );
    expect(drawingExtents(fromHeight.document)).toEqual([
      { width: 64 * aspectRatio, height: 64 },
    ]);
  });

  it('writes the alt text onto the drawing', async () => {
    const docx = await toDocxArchive(
      withPage(
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Four colour swatch"
          width="1in"
        />,
      ),
    );

    const [properties] = findAll(docx.document, 'wp:docPr');
    expect(attribute(properties, 'descr')).toBe('Four colour swatch');
  });

  it('puts the picture in a paragraph whose alignment matches align', async () => {
    const docx = await toDocxArchive(
      withPage(
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Swatch"
          width="1in"
          align="center"
        />,
      ),
    );

    const [imageParagraph] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:drawing').length > 0,
    );
    const [alignment] = findAll(imageParagraph, 'w:jc');
    expect(attribute(alignment, 'w:val')).toBe('center');
  });

  it('joins the surrounding paragraph rather than opening one of its own', async () => {
    const docx = await toDocxArchive(
      withPage(
        <p>
          Before
          <Image src={MOCK_IMAGE_DATA_URL} alt="Swatch" width="0.25in" />
          after.
        </p>,
      ),
    );

    const [paragraph, ...rest] = paragraphs(docx.document);
    expect(rest).toHaveLength(0);
    expect(findAll(paragraph, 'w:drawing')).toHaveLength(1);
    expect(textOf(paragraph)).toBe('Beforeafter.');
  });

  it('throws an error naming the src when the file is missing', async () => {
    await expect(
      toDocxBytes(
        withPage(<Image src="/nested/missing.png" alt="Missing" width="1in" />),
        { publicDirectory },
      ),
    ).rejects.toThrow('/nested/missing.png');
  });

  it('throws an error naming the src when the bytes are not an image', async () => {
    const notAnImage = path.join(publicDirectory, 'not-an-image.png');
    await fs.writeFile(notAnImage, 'plain text, not a PNG');

    await expect(
      toDocxBytes(
        withPage(<Image src={notAnImage} alt="Broken" width="1in" />),
      ),
    ).rejects.toThrow(notAnImage);
  });
});

describe('Divider', () => {
  it('writes a single bottom border in eighths of a point and hex colour', async () => {
    const docx = await toDocxArchive(
      withPage(
        <Divider
          color="#3366cc"
          thickness="2px"
          spaceBefore="12pt"
          spaceAfter="6pt"
        />,
      ),
    );

    const [divider] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:pBdr').length > 0,
    );

    expect(bottomBorderOf(divider)).toEqual({
      style: 'single',
      // 2px is 1.5pt, which is 12 eighths.
      size: '12',
      color: '3366cc',
    });
  });

  it('writes the spacing around the rule in whole twips', async () => {
    const docx = await toDocxArchive(
      withPage(
        <Divider
          color="#000000"
          thickness="1px"
          spaceBefore="12pt"
          spaceAfter="6pt"
        />,
      ),
    );

    const [divider] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:pBdr').length > 0,
    );

    expect(spacingOf(divider)).toEqual({
      before: '240', // 12pt
      after: '120', // 6pt
      // The rule occupies its own thickness (1px is 0.75pt, 15 twips) and not a
      // blank line of body text.
      line: '15',
      lineRule: 'exact',
    });
  });

  it('holds no runs of its own', async () => {
    const docx = await toDocxArchive(withPage(<Divider />));

    const [divider] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:pBdr').length > 0,
    );

    expect(findAll(divider, 'w:r')).toHaveLength(0);
  });

  it('shortens the rule with a right indent rather than a width', async () => {
    const docx = await toDocxArchive(withPage(<Divider width={25} />));

    const [divider] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:pBdr').length > 0,
    );
    const [indent] = findAll(divider, 'w:ind');

    expect(attribute(indent, 'w:right')).toBe(
      String(Math.round((CONTENT_WIDTH_TWIP * 75) / 100)),
    );
  });

  it('indents nothing when the rule spans the full width', async () => {
    const docx = await toDocxArchive(withPage(<Divider width={100} />));

    const [divider] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:pBdr').length > 0,
    );

    expect(findAll(divider, 'w:ind')).toHaveLength(0);
  });
});

describe('Spacer', () => {
  it('writes the height as exact line spacing with no space around it', async () => {
    const docx = await toDocxArchive(withPage(<Spacer height="0.5in" />));

    const [spacer] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:spacing').length > 0,
    );

    expect(spacingOf(spacer)).toEqual({
      before: '0',
      after: '0',
      // 0.5in is 36pt, which is 720 twips.
      line: '720',
      lineRule: 'exact',
    });
  });

  it('holds no runs of its own', async () => {
    const docx = await toDocxArchive(withPage(<Spacer height="24pt" />));

    const [spacer] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:spacing').length > 0,
    );

    expect(findAll(spacer, 'w:r')).toHaveLength(0);
    expect(attribute(findAll(spacer, 'w:spacing')[0], 'w:line')).toBe('480');
  });
});
