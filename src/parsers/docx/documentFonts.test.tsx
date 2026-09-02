import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { FontsConfig } from '../../entities';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { reactToDocx } from '../../reactToDocx';
import {
  attribute,
  findAll,
  inspectDocx,
  type DocxArchive,
} from '../../fixtures/docxInspect';

const FONT_FAMILY = 'Merriweather';

/**
 * Two configurations for the same family so the precedence between a document
 * and a call is observable: Word names an installed font rather than embedding
 * one, so `w:rFonts` shows which config was used.
 */
const DOCUMENT_FONTS: FontsConfig = {
  [FONT_FAMILY]: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [
          { documentType: 'docx', src: 'Cambria', format: 'truetype' },
          { documentType: 'web', src: 'Merriweather.ttf', format: 'truetype' },
        ],
      },
    ],
  },
};

const CALL_FONTS: FontsConfig = {
  [FONT_FAMILY]: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [{ documentType: 'docx', src: 'Calibri', format: 'truetype' }],
      },
    ],
  },
};

const toDocxArchive = async (
  element: ReactElement,
  fonts?: FontsConfig,
): Promise<DocxArchive> =>
  inspectDocx(await reactToDocx(() => element, { fonts }));

const runFonts = (archive: DocxArchive): ReadonlyArray<undefined | string> =>
  findAll(archive.document, 'w:rFonts').map((node) =>
    attribute(node, 'w:ascii'),
  );

const documentWithFonts = (fonts?: FontsConfig) => (
  <DocumentProvider fonts={fonts}>
    <Stack>
      <Typography as="p" fontFamily={FONT_FAMILY}>
        Body
      </Typography>
    </Stack>
  </DocumentProvider>
);

describe('fonts declared on DocumentProvider', () => {
  it('resolves w:rFonts without a call-level config', async () => {
    const archive = await toDocxArchive(documentWithFonts(DOCUMENT_FONTS));

    expect(runFonts(archive)).toContain('Cambria');
  });

  it('lets a call-level config override the document', async () => {
    const archive = await toDocxArchive(
      documentWithFonts(DOCUMENT_FONTS),
      CALL_FONTS,
    );

    expect(runFonts(archive)).toContain('Calibri');
    expect(runFonts(archive)).not.toContain('Cambria');
  });

  it('resolves the fonts of a variant style as well as of a run', async () => {
    const archive = await toDocxArchive(
      <DocumentProvider
        fonts={DOCUMENT_FONTS}
        variants={{ heading2: { fontFamily: FONT_FAMILY } }}
      >
        <Stack>
          <h2>Heading</h2>
        </Stack>
      </DocumentProvider>,
    );

    const styleFonts = findAll(archive.styles, 'w:rFonts').map((node) =>
      attribute(node, 'w:ascii'),
    );
    expect(styleFonts).toContain('Cambria');
  });
});
