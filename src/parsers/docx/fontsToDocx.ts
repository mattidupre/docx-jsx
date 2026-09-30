import { createHash } from 'node:crypto';
import { type Font, create } from 'fontkitten';
import {
  type FontFace,
  type FontsConfig,
  type WordFont,
  getFontFaceSource,
} from '../../entities';
import type { ResolvedFonts } from '../../lib/documentFonts';
import { fontStyleToString, fontWeightToInteger } from '../../utils/font';

/**
 * Embedding a document's font files in the DOCX, so Word lays text out in the
 * same font the PDF uses. `docx` embeds only a regular style per font, under
 * a random key, so the font table, its relationships and the obfuscated font
 * parts are written into the packed DOCX instead (`patchPackedDocx`).
 */

const WORD_FONT_STYLES = ['regular', 'bold', 'italic', 'boldItalic'] as const;

type WordFontStyle = (typeof WORD_FONT_STYLES)[number];

const EMBED_ELEMENT_NAMES = {
  regular: 'w:embedRegular',
  bold: 'w:embedBold',
  italic: 'w:embedItalic',
  boldItalic: 'w:embedBoldItalic',
} as const satisfies Record<WordFontStyle, string>;

/**
 * What the font table says about a font besides its files, which Word uses to
 * pick a stand-in when it cannot load them.
 */
type FontDescription = {
  /** The ten PANOSE bytes, as twenty hexadecimal digits. */
  panose1: string;
  pitch: 'fixed' | 'variable';
  /** The OS/2 Unicode and code page ranges, as eight hexadecimal digits each. */
  sig: Readonly<
    Record<'usb0' | 'usb1' | 'usb2' | 'usb3' | 'csb0' | 'csb1', string>
  >;
};

/** A family the DOCX embeds: a file for each of the styles it has. */
export type EmbeddedFont = FontDescription & {
  fontName: string;
  styles: Partial<Record<WordFontStyle, Uint8Array>>;
};

const toWordFontStyle = ({ bold, italic }: WordFont): WordFontStyle =>
  bold ? (italic ? 'boldItalic' : 'bold') : italic ? 'italic' : 'regular';

const toHex = (value: number, digits: number) =>
  value.toString(16).toUpperCase().padStart(digits, '0');

// A version 0 OS/2 table has no code page ranges.
const toHexWords = (words: undefined | ReadonlyArray<number>, count: number) =>
  Array.from({ length: count }, (_, index) => toHex(words?.[index] ?? 0, 8));

const describeFont = (font: Font): FontDescription => {
  const { panose, ulCharRange, codePageRange } = font['OS/2'];
  const [usb0, usb1, usb2, usb3] = toHexWords(ulCharRange, 4);
  const [csb0, csb1] = toHexWords(codePageRange, 2);
  return {
    panose1: panose.map((byte) => toHex(byte, 2)).join(''),
    // PANOSE proportion 9 is monospaced, for Latin text faces (family 2).
    pitch: panose[0] === 2 && panose[3] === 9 ? 'fixed' : 'variable',
    sig: { usb0, usb1, usb2, usb3, csb0, csb1 },
  };
};

/**
 * Whether the licence lets a document carry the font (OS/2 `fsType`):
 * installable (no bits), editable and preview & print may be embedded;
 * restricted may not, unless a less restrictive bit is set as well, which
 * wins. A font that allows only its bitmaps has no outlines Word could use.
 */
const isEmbeddable = (font: Font): boolean => {
  const { noEmbedding, viewOnly, editable, bitmapOnly } = font['OS/2'].fsType;
  return !bitmapOnly && (!noEmbedding || viewOnly || editable);
};

type ReadFontFile =
  | { wordFont: WordFont; font: Font; embeddable: boolean }
  | { wordFont: undefined };

/**
 * A font file as Word knows it. Word reads only OpenType (TrueType or CFF
 * outlines) as a single font, not a collection or a web font.
 */
const readFontFile = (data: Uint8Array, label: string): ReadFontFile => {
  let fontOrCollection: ReturnType<typeof create>;
  try {
    fontOrCollection = create(Buffer.from(data));
  } catch (error) {
    console.warn(`Cannot read the ${label}; the DOCX cannot name it.`, error);
    return { wordFont: undefined };
  }
  if (fontOrCollection.isCollection || fontOrCollection.type !== 'TTF') {
    console.warn(
      `The ${label} is not a single TrueType or OpenType font; the DOCX cannot name it.`,
    );
    return { wordFont: undefined };
  }
  const font = fontOrCollection;
  const fontName = font.getName('fontFamily');
  if (!fontName) {
    console.warn(`The ${label} has no family name; the DOCX cannot name it.`);
    return { wordFont: undefined };
  }
  const { bold, italic } = font['OS/2'].fsSelection;
  return {
    wordFont: { fontName, bold, italic },
    font,
    embeddable: isEmbeddable(font),
  };
};

const isSameData = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, index) => byte === b[index]);

/**
 * The document's fonts as the DOCX names them, and the font files it embeds.
 *
 * A face with a `docx` source names that installed font and embeds nothing:
 * the source is Word's own font, or a stand-in for the file, which does not
 * carry that name. Every other face with a font file is named by the family
 * its file names itself (`wordFont`), and the file is embedded in the style
 * it fills in that family, unless its licence forbids it or `embedFonts` is
 * off.
 */
export const resolveDocxFonts = (
  { fonts, fontFiles }: ResolvedFonts,
  { embedFonts }: { embedFonts: boolean },
): { fonts: FontsConfig; embeddedFonts: ReadonlyArray<EmbeddedFont> } => {
  const embeddedFonts = new Map<string, EmbeddedFont>();

  const embed = (
    wordFont: WordFont,
    font: Font,
    data: Uint8Array,
    label: string,
  ) => {
    const style = toWordFontStyle(wordFont);
    const embeddedFont = embeddedFonts.get(wordFont.fontName) ?? {
      fontName: wordFont.fontName,
      ...describeFont(font),
      styles: {},
    };
    const embeddedData = embeddedFont.styles[style];
    if (embeddedData && !isSameData(embeddedData, data)) {
      console.warn(
        `The ${label} is another ${style} style of "${wordFont.fontName}"; the DOCX embeds the first.`,
      );
      return;
    }
    embeddedFont.styles[style] = data;
    embeddedFonts.set(wordFont.fontName, embeddedFont);
  };

  const resolveFontFace = (
    fontFamily: string,
    fontFace: FontFace,
  ): FontFace => {
    const data = fontFiles.get(fontFace);
    if (getFontFaceSource(fontFace, 'docx') || !data) {
      return fontFace;
    }
    const label = `font file of ${fontFamily} ${fontWeightToInteger(fontFace)} ${fontStyleToString(fontFace)}`;
    const file = readFontFile(data, label);
    if (!file.wordFont) {
      return fontFace;
    }
    if (!file.embeddable) {
      console.warn(
        `The licence of the font "${file.wordFont.fontName}" (the ${label}) does not allow embedding it; the DOCX names it without embedding it.`,
      );
    } else if (embedFonts) {
      embed(file.wordFont, file.font, data, label);
    }
    return { ...fontFace, wordFont: file.wordFont };
  };

  return {
    fonts: Object.fromEntries(
      Object.entries(fonts).map(([fontFamily, font]) => [
        fontFamily,
        {
          ...font,
          fontFaces: font.fontFaces.map((fontFace) =>
            resolveFontFace(fontFamily, fontFace),
          ),
        },
      ]),
    ),
    embeddedFonts: [...embeddedFonts.values()],
  };
};

/**
 * The key a font part is obfuscated with (ECMA-376 Part 1, §17.8.1), a GUID.
 * It is derived from the font's bytes, so the same font always gets the same
 * key and the DOCX stays the same from one render to the next.
 */
export const toFontKey = (data: Uint8Array): string => {
  const hex = createHash('sha256')
    .update(data)
    .digest('hex')
    .slice(0, 32)
    .toUpperCase();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
};

const OBFUSCATED_LENGTH = 32;

/**
 * A font file obfuscated as ECMA-376 Part 1, §17.8.1 embeds it: the first 32
 * bytes XORed with the key's 16 bytes, which are the GUID's hexadecimal
 * digits read as bytes in reverse order. Obfuscating twice restores the file.
 */
export const obfuscateFont = (
  data: Uint8Array,
  fontKey: string,
): Uint8Array => {
  const digits = fontKey.replace(/[{}-]/g, '');
  if (!/^[\dA-Fa-f]{32}$/.test(digits)) {
    throw new TypeError(`Expected a font key GUID, received "${fontKey}".`);
  }
  const key = Array.from({ length: 16 }, (_, index) =>
    Number.parseInt(digits.slice(30 - index * 2, 32 - index * 2), 16),
  );
  const obfuscated = new Uint8Array(data);
  for (
    let index = 0;
    index < Math.min(OBFUSCATED_LENGTH, data.length);
    index += 1
  ) {
    obfuscated[index] ^= key[index % key.length];
  }
  return obfuscated;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const XML_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const unescapeXml = (value: string) =>
  value.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (_, name: string) => XML_ENTITIES[name],
  );

const RUN_FONTS_EXP = /<w:rFonts\b([^>]*)>/g;

const RUN_FONT_NAME_EXP = /\bw:(?:ascii|hAnsi|cs|eastAsia)="([^"]*)"/g;

/** The fonts the runs, styles and defaults of a part name (`w:rFonts`). */
export const readRunFontNames = (xml: string): ReadonlyArray<string> =>
  [...xml.matchAll(RUN_FONTS_EXP)].flatMap(([, attributes]) =>
    [...attributes.matchAll(RUN_FONT_NAME_EXP)].map(([, name]) =>
      unescapeXml(name),
    ),
  );

const FONT_RELATIONSHIP_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font';

/** The parts that embed `embeddedFonts`, beside the font table. */
export type FontTableParts = {
  /** The `w:font` elements of the font table. */
  fonts: string;
  /** The font table's relationships part. */
  relationships: string;
  /** The obfuscated font files, by path in the package. */
  files: ReadonlyArray<{ path: string; data: Uint8Array }>;
};

export const toFontTableParts = (
  embeddedFonts: ReadonlyArray<EmbeddedFont>,
): FontTableParts => {
  const relationships: Array<string> = [];
  const files: Array<{ path: string; data: Uint8Array }> = [];
  const fonts = embeddedFonts.map(
    ({ fontName, panose1, pitch, sig, styles }) => {
      const embeds = WORD_FONT_STYLES.flatMap((style) => {
        const data = styles[style];
        if (!data) {
          return [];
        }
        const index = files.length + 1;
        const id = `rId${index}`;
        const target = `fonts/font${index}.odttf`;
        const fontKey = toFontKey(data);
        files.push({
          path: `word/${target}`,
          data: obfuscateFont(data, fontKey),
        });
        relationships.push(
          `<Relationship Id="${id}" Type="${FONT_RELATIONSHIP_TYPE}" Target="${target}"/>`,
        );
        return [
          `<${EMBED_ELEMENT_NAMES[style]} r:id="${id}" w:fontKey="{${fontKey}}"/>`,
        ];
      });
      const sigAttributes = Object.entries(sig)
        .map(([name, value]) => ` w:${name}="${value}"`)
        .join('');
      return [
        `<w:font w:name="${escapeXml(fontName)}">`,
        `<w:panose1 w:val="${panose1}"/>`,
        '<w:charset w:val="00"/>',
        '<w:family w:val="auto"/>',
        `<w:pitch w:val="${pitch}"/>`,
        `<w:sig${sigAttributes}/>`,
        ...embeds,
        '</w:font>',
      ].join('');
    },
  );
  return {
    fonts: fonts.join(''),
    relationships: [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      ...relationships,
      '</Relationships>',
    ].join(''),
    files,
  };
};

/** The font table `docx` writes, with `fonts` added to its `w:font` list. */
export const writeFontTable = (fontTableXml: string, fonts: string): string => {
  if (fontTableXml.includes('</w:fonts>')) {
    return fontTableXml.replace('</w:fonts>', `${fonts}</w:fonts>`);
  }
  return fontTableXml.replace(
    /<w:fonts\b([^>]*?)\s*\/>/,
    `<w:fonts$1>${fonts}</w:fonts>`,
  );
};

const OBFUSCATED_FONT_CONTENT_TYPE =
  '<Default ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont" Extension="odttf"/>';

/** The package's content types, declaring the obfuscated font parts. */
export const writeFontContentType = (contentTypesXml: string): string =>
  /Extension="odttf"/.test(contentTypesXml)
    ? contentTypesXml
    : contentTypesXml.replace(
        /(<Types\b[^>]*>)/,
        `$1${OBFUSCATED_FONT_CONTENT_TYPE}`,
      );

/**
 * `w:embedTrueTypeFonts`, which keeps Word embedding the fonts when the
 * document is saved again. It comes after `w:displayBackgroundShape` in
 * `CT_Settings` and before everything else `docx` writes.
 */
export const writeEmbedTrueTypeFonts = (settingsXml: string): string =>
  settingsXml.includes('<w:embedTrueTypeFonts')
    ? settingsXml
    : settingsXml.includes('<w:displayBackgroundShape/>')
      ? settingsXml.replace(
          '<w:displayBackgroundShape/>',
          '<w:displayBackgroundShape/><w:embedTrueTypeFonts/>',
        )
      : settingsXml.replace(
          /(<w:settings\b[^>]*>)/,
          '$1<w:embedTrueTypeFonts/>',
        );
