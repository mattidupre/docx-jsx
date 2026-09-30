import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { Document, Packer, Paragraph } from 'docx';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { FontFace, FontsConfig } from '../../entities';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { reactToDocx } from '../../reactToDocx';
import { resolveFontFiles } from '../../lib/documentFonts';
import {
  attribute,
  childrenOf,
  findAll,
  inspectDocx,
  tagNameOf,
  type DocxArchive,
  type XmlNode,
} from '../../fixtures/docxInspect';
import {
  obfuscateFont,
  readRunFontNames,
  resolveDocxFonts,
  toFontKey,
  writeEmbedTrueTypeFonts,
  writeFontContentType,
  writeFontTable,
} from './fontsToDocx';

const MOCK_ASSETS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'mockAssets',
);

const readMockAsset = async (fileName: string) =>
  new Uint8Array(await fs.readFile(path.join(MOCK_ASSETS_PATH, fileName)));

const PACIFICO = await readMockAsset('Pacifico.ttf');

const FS_SELECTION_ITALIC = 0x0001;
const FS_SELECTION_BOLD = 0x0020;
const FS_SELECTION_REGULAR = 0x0040;

/**
 * A copy of a TrueType file with fields of its OS/2 table replaced: `fsType`
 * (the licence's embedding permissions, at offset 8) and `fsSelection` (the
 * style, at offset 62). The fixture fonts are all installable regular
 * styles, so the other cases are made from them.
 */
const withOs2 = (
  data: Uint8Array,
  { fsType, fsSelection }: { fsType?: number; fsSelection?: number },
): Uint8Array => {
  const copy = new Uint8Array(data);
  const view = new DataView(copy.buffer);
  const tableCount = view.getUint16(4);
  for (let index = 0; index < tableCount; index += 1) {
    const record = 12 + index * 16;
    const tag = String.fromCharCode(...copy.subarray(record, record + 4));
    if (tag === 'OS/2') {
      const offset = view.getUint32(record + 8);
      if (fsType !== undefined) {
        view.setUint16(offset + 8, fsType);
      }
      if (fsSelection !== undefined) {
        view.setUint16(offset + 62, fsSelection);
      }
      return copy;
    }
  }
  throw new TypeError('Expected the font file to have an OS/2 table.');
};

const toDataUrl = (data: Uint8Array) =>
  `data:font/ttf;base64,${Buffer.from(data).toString('base64')}`;

const fileFace = (
  src: string,
  options: Pick<FontFace, 'fontWeight' | 'fontStyle'> = {},
): FontFace => ({
  fontWeight: '400',
  fontStyle: 'normal',
  ...options,
  sources: [{ documentType: 'pdf', src, format: 'truetype' }],
});

const PACIFICO_BOLD = toDataUrl(
  withOs2(PACIFICO, { fsSelection: FS_SELECTION_BOLD }),
);
const PACIFICO_ITALIC = toDataUrl(
  withOs2(PACIFICO, { fsSelection: FS_SELECTION_ITALIC }),
);
const PACIFICO_BOLD_ITALIC = toDataUrl(
  withOs2(PACIFICO, { fsSelection: FS_SELECTION_BOLD | FS_SELECTION_ITALIC }),
);

/** Pacifico in all four of Word's styles, under a CSS family of its own. */
const SCRIPT_FONTS: FontsConfig = {
  Script: {
    fontFaces: [
      fileFace('/Pacifico.ttf'),
      fileFace(PACIFICO_BOLD, { fontWeight: '700' }),
      fileFace(PACIFICO_ITALIC, { fontStyle: 'italic' }),
      fileFace(PACIFICO_BOLD_ITALIC, {
        fontWeight: '700',
        fontStyle: 'italic',
      }),
    ],
  },
  Unused: { fontFaces: [fileFace('/Sevillana.ttf')] },
};

const toDocxBuffer = (
  element: ReactElement,
  options: { fonts?: FontsConfig; embedFonts?: boolean } = {},
) =>
  reactToDocx(() => element, { publicDirectory: MOCK_ASSETS_PATH, ...options });

const scriptDocument = (fonts: FontsConfig = SCRIPT_FONTS) => (
  <DocumentProvider fonts={fonts}>
    <Stack>
      <Typography as="p" fontFamily="Script">
        Regular <Typography fontWeight="bold">bold</Typography>{' '}
        <Typography fontStyle="italic">italic</Typography>
      </Typography>
    </Stack>
  </DocumentProvider>
);

const readZip = async (content: Uint8Array) => JSZip.loadAsync(content);

const readPart = async (zip: JSZip, partPath: string) => {
  const file = zip.file(partPath);
  if (!file) {
    throw new TypeError(`Expected the DOCX archive to contain ${partPath}.`);
  }
  return file;
};

const fontsOf = (archive: DocxArchive) => findAll(archive.fontTable, 'w:font');

const embedsOf = (font: XmlNode) =>
  childrenOf(font)
    .filter((child) => tagNameOf(child).startsWith('w:embed'))
    .map((child) => ({
      style: tagNameOf(child),
      id: attribute(child, 'r:id'),
      fontKey: attribute(child, 'w:fontKey'),
    }));

/** Each run's font name and toggles, by its text. */
const runsOf = (archive: DocxArchive) =>
  findAll(archive.document, 'w:r').map((run) => {
    const [fonts] = findAll(run, 'w:rFonts');
    const [bold] = findAll(run, 'w:b');
    const [italics] = findAll(run, 'w:i');
    const toggle = (node: undefined | XmlNode) =>
      node && attribute(node, 'w:val') !== 'false';
    return {
      text: findAll(run, 'w:t')
        .flatMap((text) => childrenOf(text).map((node) => node['#text']))
        .join(''),
      font: fonts && attribute(fonts, 'w:ascii'),
      bold: toggle(bold),
      italics: toggle(italics),
    };
  });

let warn: MockInstance;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('embedded fonts', () => {
  it('writes each style of a family into the font table', async () => {
    const archive = await inspectDocx(await toDocxBuffer(scriptDocument()));

    const [font, ...others] = fontsOf(archive);
    expect(others).toEqual([]);
    expect(attribute(font, 'w:name')).toBe('Pacifico');
    expect(embedsOf(font)).toEqual([
      { style: 'w:embedRegular', id: 'rId1', fontKey: expect.any(String) },
      { style: 'w:embedBold', id: 'rId2', fontKey: expect.any(String) },
      { style: 'w:embedItalic', id: 'rId3', fontKey: expect.any(String) },
      { style: 'w:embedBoldItalic', id: 'rId4', fontKey: expect.any(String) },
    ]);
    expect(
      childrenOf(font)
        .map((child) => tagNameOf(child))
        .slice(0, 5),
    ).toEqual(['w:panose1', 'w:charset', 'w:family', 'w:pitch', 'w:sig']);
    expect(findAll(archive.settings, 'w:embedTrueTypeFonts')).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('names the family the font file names itself on every run', async () => {
    const archive = await inspectDocx(await toDocxBuffer(scriptDocument()));

    expect(runsOf(archive)).toEqual([
      {
        text: 'Regular ',
        font: 'Pacifico',
        bold: undefined,
        italics: undefined,
      },
      { text: 'bold', font: 'Pacifico', bold: true, italics: undefined },
      { text: ' ', font: 'Pacifico', bold: undefined, italics: undefined },
      { text: 'italic', font: 'Pacifico', bold: undefined, italics: true },
    ]);
  });

  it('relates every style to an obfuscated font part', async () => {
    const zip = await readZip(await toDocxBuffer(scriptDocument()));

    const relationships = await (
      await readPart(zip, 'word/_rels/fontTable.xml.rels')
    ).async('string');
    for (const index of [1, 2, 3, 4]) {
      expect(relationships).toContain(
        `<Relationship Id="rId${index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font${index}.odttf"/>`,
      );
      await readPart(zip, `word/fonts/font${index}.odttf`);
    }
    expect(zip.file(/\.odttf$/)).toHaveLength(4);

    const contentTypes = await (
      await readPart(zip, '[Content_Types].xml')
    ).async('string');
    expect(contentTypes).toContain(
      '<Default ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont" Extension="odttf"/>',
    );

    const documentRelationships = await (
      await readPart(zip, 'word/_rels/document.xml.rels')
    ).async('string');
    expect(documentRelationships).toContain('Target="fontTable.xml"');
  });

  it('obfuscates a font part so that its key restores the file', async () => {
    const content = await toDocxBuffer(scriptDocument());
    const archive = await inspectDocx(content);
    const zip = await readZip(content);

    const [regular] = embedsOf(fontsOf(archive)[0]);
    const obfuscated = await (
      await readPart(zip, 'word/fonts/font1.odttf')
    ).async('uint8array');
    expect(regular.fontKey).toMatch(
      /^\{[\dA-F]{8}-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{12}\}$/,
    );
    expect(obfuscated.subarray(0, 32)).not.toEqual(PACIFICO.subarray(0, 32));
    expect(obfuscated.subarray(32)).toEqual(PACIFICO.subarray(32));
    expect(obfuscateFont(obfuscated, regular.fontKey ?? '')).toEqual(PACIFICO);
  });

  it('obfuscates as `docx` does', async () => {
    const zip = await readZip(
      await Packer.toBuffer(
        new Document({
          fonts: [{ name: 'Pacifico', data: Buffer.from(PACIFICO) }],
          sections: [{ children: [new Paragraph('Text')] }],
        }),
      ),
    );
    const fontTable = await (
      await readPart(zip, 'word/fontTable.xml')
    ).async('string');
    const [, fontKey] = /w:fontKey="([^"]+)"/.exec(fontTable) ?? [];
    const obfuscated = await (
      await readPart(zip, 'word/fonts/font1.odttf')
    ).async('uint8array');

    expect(obfuscateFont(obfuscated, fontKey)).toEqual(PACIFICO);
  });

  it('writes the same font parts for the same document', async () => {
    const readFontParts = async () => {
      const zip = await readZip(await toDocxBuffer(scriptDocument()));
      return Promise.all(
        [
          'word/fontTable.xml',
          'word/_rels/fontTable.xml.rels',
          ...[1, 2, 3, 4].map((index) => `word/fonts/font${index}.odttf`),
        ].map(async (partPath) =>
          (await readPart(zip, partPath)).async('uint8array'),
        ),
      );
    };

    expect(await readFontParts()).toEqual(await readFontParts());
    expect(toFontKey(PACIFICO)).toBe(toFontKey(new Uint8Array(PACIFICO)));
  });

  it('embeds only the families the document names', async () => {
    const archive = await inspectDocx(await toDocxBuffer(scriptDocument()));

    expect(fontsOf(archive).map((font) => attribute(font, 'w:name'))).toEqual([
      'Pacifico',
    ]);
  });

  it('skips a font whose licence restricts embedding, with a warning', async () => {
    const restricted = toDataUrl(withOs2(PACIFICO, { fsType: 0x0002 }));
    const content = await toDocxBuffer(
      scriptDocument({ Script: { fontFaces: [fileFace(restricted)] } }),
    );
    const archive = await inspectDocx(content);

    expect(fontsOf(archive)).toEqual([]);
    expect((await readZip(content)).file(/\.odttf$/)).toEqual([]);
    expect(findAll(archive.settings, 'w:embedTrueTypeFonts')).toEqual([]);
    expect(runsOf(archive)[0].font).toBe('Pacifico');
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/licence of the font "Pacifico".*embedding/),
    );
  });

  it('embeds a font whose licence allows preview & print or editing', async () => {
    for (const fsType of [0x0004, 0x0008, 0x0002 | 0x0004]) {
      const permitted = toDataUrl(withOs2(PACIFICO, { fsType }));
      const archive = await inspectDocx(
        await toDocxBuffer(
          scriptDocument({ Script: { fontFaces: [fileFace(permitted)] } }),
        ),
      );

      expect(fontsOf(archive).map((font) => attribute(font, 'w:name'))).toEqual(
        ['Pacifico'],
      );
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('names but does not embed the fonts when `embedFonts` is off', async () => {
    const content = await toDocxBuffer(scriptDocument(), {
      embedFonts: false,
    });
    const archive = await inspectDocx(content);

    expect(fontsOf(archive)).toEqual([]);
    expect((await readZip(content)).file(/\.odttf$/)).toEqual([]);
    expect(runsOf(archive)[0].font).toBe('Pacifico');
  });

  it('names the installed font of a face with a `docx` source, embedding nothing', async () => {
    const archive = await inspectDocx(
      await toDocxBuffer(
        scriptDocument({
          Script: {
            fontFaces: [
              {
                fontWeight: '400',
                sources: [
                  {
                    documentType: 'pdf',
                    src: '/Pacifico.ttf',
                    format: 'truetype',
                  },
                  { documentType: 'docx', src: 'Calibri', format: 'truetype' },
                ],
              },
            ],
          },
        }),
      ),
    );

    expect(fontsOf(archive)).toEqual([]);
    expect(runsOf(archive)[0].font).toBe('Calibri');
  });

  it('picks the style of the face the browser picks', async () => {
    // Only a 400 and an 800 face: bold text is set in the 800 face, which is
    // the regular style of a family of its own, so Word must not embolden it;
    // italic text is set in the 400 face, slanted by the browser, so Word
    // slants it too.
    const archive = await inspectDocx(
      await toDocxBuffer(
        scriptDocument({
          Script: {
            fontFaces: [
              fileFace('/Pacifico.ttf'),
              fileFace('/Sevillana.ttf', { fontWeight: '800' }),
            ],
          },
        }),
      ),
    );

    expect(runsOf(archive)).toEqual([
      {
        text: 'Regular ',
        font: 'Pacifico',
        bold: undefined,
        italics: undefined,
      },
      { text: 'bold', font: 'Sevillana', bold: false, italics: undefined },
      { text: ' ', font: 'Pacifico', bold: undefined, italics: undefined },
      { text: 'italic', font: 'Pacifico', bold: undefined, italics: true },
    ]);
    expect(fontsOf(archive).map((font) => attribute(font, 'w:name'))).toEqual([
      'Pacifico',
      'Sevillana',
    ]);
  });
});

describe('resolveDocxFonts', () => {
  it('fills each of the four styles from the file, whatever the face declares', async () => {
    const { embeddedFonts } = resolveDocxFonts(
      await resolveFontFiles(SCRIPT_FONTS, {
        publicDirectory: MOCK_ASSETS_PATH,
      }),
      { embedFonts: true },
    );

    expect(
      embeddedFonts.map(({ fontName, styles }) => [
        fontName,
        Object.keys(styles),
      ]),
    ).toEqual([
      ['Pacifico', ['regular', 'bold', 'italic', 'boldItalic']],
      ['Sevillana', ['regular']],
    ]);
  });

  it('keeps the first file of a style and warns about the next', async () => {
    const otherRegular = toDataUrl(
      withOs2(PACIFICO, { fsSelection: FS_SELECTION_REGULAR, fsType: 0x0008 }),
    );
    const { embeddedFonts } = resolveDocxFonts(
      await resolveFontFiles(
        {
          Script: {
            fontFaces: [
              fileFace('/Pacifico.ttf'),
              fileFace(otherRegular, { fontWeight: '700' }),
            ],
          },
        },
        { publicDirectory: MOCK_ASSETS_PATH },
      ),
      { embedFonts: true },
    );

    expect(embeddedFonts[0].styles.regular).toEqual(PACIFICO);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/another regular style of "Pacifico"/),
    );
  });
});

describe('font table parts', () => {
  it('reads the fonts runs name', () => {
    expect(
      readRunFontNames(
        '<w:rPr><w:rFonts w:ascii="A &amp; B" w:hAnsi="A &amp; B"/></w:rPr><w:rFonts w:cs="C"/>',
      ),
    ).toEqual(['A & B', 'A & B', 'C']);
  });

  it('adds fonts to the empty font table `docx` writes', () => {
    expect(
      writeFontTable('<w:fonts xmlns:w="w" mc:Ignorable="w14"/>', '<w:font/>'),
    ).toBe('<w:fonts xmlns:w="w" mc:Ignorable="w14"><w:font/></w:fonts>');
    expect(writeFontTable('<w:fonts><w:font/></w:fonts>', '<w:font/>')).toBe(
      '<w:fonts><w:font/><w:font/></w:fonts>',
    );
  });

  it('declares the obfuscated font content type once', () => {
    const declared = writeFontContentType('<Types xmlns="t"></Types>');
    expect(declared).toBe(
      '<Types xmlns="t"><Default ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont" Extension="odttf"/></Types>',
    );
    expect(writeFontContentType(declared)).toBe(declared);
  });

  it('writes `w:embedTrueTypeFonts` where `CT_Settings` puts it', () => {
    expect(
      writeEmbedTrueTypeFonts(
        '<w:settings x="y"><w:displayBackgroundShape/><w:evenAndOddHeaders w:val="false"/></w:settings>',
      ),
    ).toBe(
      '<w:settings x="y"><w:displayBackgroundShape/><w:embedTrueTypeFonts/><w:evenAndOddHeaders w:val="false"/></w:settings>',
    );
    expect(
      writeEmbedTrueTypeFonts('<w:settings x="y"><w:compat/></w:settings>'),
    ).toBe('<w:settings x="y"><w:embedTrueTypeFonts/><w:compat/></w:settings>');
  });
});
