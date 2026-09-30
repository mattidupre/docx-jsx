import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  type DefaultTypography,
  type FontsConfig,
  MissingFontMetricsError,
} from '../../entities';
import {
  DocumentProvider,
  Image,
  Stack,
  Typography,
} from '../../reactComponents';
import { reactToDocx } from '../../reactToDocx';
import { MOCK_IMAGE_DATA_URL } from '../../fixtures/mockImage';
import {
  attribute,
  findAll,
  inspectDocx,
  paragraphs,
  textOf,
  type DocxArchive,
  type XmlNode,
} from '../../fixtures/docxInspect';

const MOCK_ASSETS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'mockAssets',
);

/**
 * Merriweather's metrics are round numbers: 1000 units to the em, an ascent of
 * 984, a descent of 273, no line gap and capitals 743 units tall. At 12pt its
 * single line is 15.084pt and its capitals are 8.916pt.
 */
const FONTS: FontsConfig = {
  Merriweather: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [
          {
            documentType: 'pdf',
            src: '/Merriweather-Regular.ttf',
            format: 'truetype',
          },
          { documentType: 'docx', src: 'Cambria', format: 'truetype' },
        ],
      },
    ],
  },
};

const TRIMMED: DefaultTypography = {
  fontFamily: 'Merriweather',
  fontSize: '12pt',
  lineHeight: '18pt',
  textBoxTrim: 'both',
};

/** 0.8 × 18 + 0.25 − 8.916 and 0.2 × 18 − 0.25, in points. */
const ABOVE_CAPS = 5.734;
const BELOW_BASELINE = 3.35;

const toDocx = async (
  element: ReactElement,
  { publicDirectory = MOCK_ASSETS_PATH }: { publicDirectory?: string } = {},
): Promise<DocxArchive> =>
  inspectDocx(await reactToDocx(() => element, { publicDirectory }));

const withDocument = (
  defaultTypography: undefined | DefaultTypography,
  children: ReactElement | ReadonlyArray<ReactElement>,
) => (
  <DocumentProvider fonts={FONTS} defaultTypography={defaultTypography}>
    <Stack>{children}</Stack>
  </DocumentProvider>
);

const spacingOf = (paragraph: XmlNode) => {
  const [spacing] = findAll(paragraph, 'w:spacing');
  return spacing
    ? {
        before: attribute(spacing, 'w:before'),
        after: attribute(spacing, 'w:after'),
        line: attribute(spacing, 'w:line'),
        lineRule: attribute(spacing, 'w:lineRule'),
      }
    : undefined;
};

const spacingsOf = (archive: DocxArchive) =>
  paragraphs(archive.document)
    .filter((paragraph) => textOf(paragraph).length > 0)
    .map(spacingOf);

const twips = (valuePt: number) => String(Math.round(valuePt * 20));

let warn: MockInstance;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exact lines', () => {
  it('writes a multiplier as the exact line it comes to', async () => {
    const archive = await toDocx(
      withDocument(
        undefined,
        <Typography as="p" fontSize="10pt" lineHeight="1.5">
          Body
        </Typography>,
      ),
    );

    expect(spacingsOf(archive)).toEqual([
      { before: undefined, after: undefined, line: '300', lineRule: 'exact' },
    ]);
  });

  it("writes `normal` as the font's own single line", async () => {
    const archive = await toDocx(
      withDocument(
        { fontFamily: 'Merriweather', fontSize: '12pt' },
        <Typography as="p" lineHeight="normal">
          Body
        </Typography>,
      ),
    );

    expect(spacingsOf(archive)[0]).toMatchObject({
      line: twips(15.084),
      lineRule: 'exact',
    });
  });

  it('writes a paragraph holding a picture as at least its line', async () => {
    const archive = await toDocx(
      withDocument(
        undefined,
        <Typography as="p" lineHeight="18pt">
          Picture <Image src={MOCK_IMAGE_DATA_URL} alt="Swatch" width="1in" />
        </Typography>,
      ),
    );

    expect(spacingsOf(archive)[0]).toMatchObject({
      line: '360',
      lineRule: 'atLeast',
    });
  });

  it('leaves text that sets no line height and has no metrics as before', async () => {
    const archive = await toDocx(
      withDocument(undefined, <Typography as="p">Body</Typography>),
    );

    expect(spacingsOf(archive)).toEqual([undefined]);
  });
});

describe('document defaults', () => {
  it('writes w:docDefaults from the default typography', async () => {
    const archive = await toDocx(
      withDocument(
        { fontFamily: 'Merriweather', fontSize: '11pt', lineHeight: '1.5' },
        <Typography as="p">Body</Typography>,
      ),
    );

    const [docDefaults] = findAll(archive.styles, 'w:docDefaults');
    const [size] = findAll(docDefaults, 'w:sz');
    const [fonts] = findAll(docDefaults, 'w:rFonts');
    const [spacing] = findAll(docDefaults, 'w:spacing');
    expect(attribute(size, 'w:val')).toBe('22');
    expect(attribute(fonts, 'w:ascii')).toBe('Cambria');
    expect(attribute(spacing, 'w:line')).toBe(twips(16.5));
    expect(attribute(spacing, 'w:lineRule')).toBe('exact');
    // The paragraph resolves to the same line.
    expect(spacingsOf(archive)[0]).toMatchObject({ line: twips(16.5) });
  });

  it('writes a style its own exact line over the defaults', async () => {
    const archive = await toDocx(
      <DocumentProvider
        fonts={FONTS}
        defaultTypography={{ fontFamily: 'Merriweather', lineHeight: '1.5' }}
        variants={{ heading2: { fontSize: '20pt' } }}
      >
        <Stack>
          <h2>Heading</h2>
        </Stack>
      </DocumentProvider>,
    );

    const heading = findAll(archive.styles, 'w:style').find(
      (style) => attribute(style, 'w:styleId') === 'Heading2',
    );
    if (!heading) {
      throw new Error('Expected a Heading2 style.');
    }
    const [spacing] = findAll(heading, 'w:spacing');
    expect(attribute(spacing, 'w:line')).toBe(twips(30));
    expect(attribute(spacing, 'w:lineRule')).toBe('exact');
  });
});

describe('capHeight', () => {
  it('sizes a run by the cap height of its font', async () => {
    const archive = await toDocx(
      withDocument(
        { fontFamily: 'Merriweather' },
        <Typography as="p" capHeight="7.43pt" lineHeight="1.2">
          Caps
        </Typography>,
      ),
    );

    // 7.43pt capitals are 10pt Merriweather.
    const [size] = findAll(archive.document, 'w:sz');
    expect(attribute(size, 'w:val')).toBe('20');
    expect(spacingsOf(archive)[0]).toMatchObject({ line: '240' });
  });
});

describe('trimmed paragraphs', () => {
  it('moves the space Word keeps around its lines out of the spacing', async () => {
    const archive = await toDocx(
      withDocument(TRIMMED, [
        <Typography key="a" as="p" marginBottom="12pt">
          A
        </Typography>,
        <Typography key="b" as="p" marginTop="6pt">
          B
        </Typography>,
      ]),
    );

    const [first, second] = spacingsOf(archive);
    expect(first).toMatchObject({ after: '0', line: '360', lineRule: 'exact' });
    // g − (0.2 L₁ − 0.25pt) − (0.8 L₂ + 0.25pt − cap₂), with g = 12pt.
    expect(second).toMatchObject({
      before: twips(12 - BELOW_BASELINE - ABOVE_CAPS),
    });
  });

  it('keeps an even rhythm at no spacing between lines', async () => {
    // A margin of L − cap puts the next capitals one line below the baseline.
    const rhythm = `${18 - 8.916}pt` as const;
    const archive = await toDocx(
      withDocument(TRIMMED, [
        <Typography key="a" as="p" marginBottom={rhythm}>
          A
        </Typography>,
        <Typography key="b" as="p">
          B
        </Typography>,
      ]),
    );

    expect(spacingsOf(archive)[1]).toMatchObject({ before: '0' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('takes the top of the section as the box before the first paragraph', async () => {
    const archive = await toDocx(
      withDocument(TRIMMED, [
        <Typography key="a" as="p" marginTop="24pt">
          A
        </Typography>,
      ]),
    );

    expect(spacingsOf(archive)[0]).toMatchObject({
      before: twips(24 - ABOVE_CAPS),
    });
  });

  it('writes a spacing it cannot make negative as 0, warning only between paragraphs', async () => {
    const archive = await toDocx(
      withDocument(TRIMMED, [
        <Typography key="a" as="p" marginBottom="2pt">
          A
        </Typography>,
        <Typography key="b" as="p">
          B
        </Typography>,
      ]),
    );

    // The first paragraph starts the section and is placed as the PDF places
    // it; only the pair is further apart than in the PDF.
    expect(spacingsOf(archive).map((spacing) => spacing?.before)).toEqual([
      '0',
      '0',
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('further apart');
  });

  it('compensates an untrimmed paragraph after a trimmed one on its side only', async () => {
    const archive = await toDocx(
      withDocument(TRIMMED, [
        <Typography key="a" as="p">
          A
        </Typography>,
        <Typography key="b" as="p" textBoxTrim="none" marginTop="10pt">
          B
        </Typography>,
      ]),
    );

    expect(spacingsOf(archive)[1]).toMatchObject({
      before: twips(10 - BELOW_BASELINE),
    });
  });
});

describe('missing font metrics', () => {
  it('needs none for an inline set in a font without them', async () => {
    const archive = await toDocx(
      withDocument(
        { fontFamily: 'Merriweather', lineHeight: 'normal' },
        <Typography as="p">
          Body with <code>code</code>
        </Typography>,
      ),
    );

    expect(spacingsOf(archive)[0]).toMatchObject({ line: twips(12 * 1.257) });
  });

  it('refuses text that needs the metrics of a font without a file', async () => {
    await expect(
      toDocx(
        withDocument(
          { fontFamily: 'Merriweather' },
          <Typography as="p" textBoxTrim="both">
            Body
          </Typography>,
        ),
        // No public directory: the font file cannot be read.
        { publicDirectory: path.join(MOCK_ASSETS_PATH, 'missing') },
      ),
    ).rejects.toThrow(MissingFontMetricsError);
  });
});
