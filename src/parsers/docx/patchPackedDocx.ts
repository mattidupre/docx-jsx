import JSZip from 'jszip';
import {
  type EmbeddedFont,
  readRunFontNames,
  toFontTableParts,
  writeEmbedTrueTypeFonts,
  writeFontContentType,
  writeFontTable,
} from './fontsToDocx';

const DOCUMENT_PATH = 'word/document.xml';

const STYLES_PATH = 'word/styles.xml';

const SETTINGS_PATH = 'word/settings.xml';

const FONT_TABLE_PATH = 'word/fontTable.xml';

const FONT_TABLE_RELATIONSHIPS_PATH = 'word/_rels/fontTable.xml.rels';

const CONTENT_TYPES_PATH = '[Content_Types].xml';

const WORD_PART_EXP = /^word\/[^/]+\.xml$/;

/**
 * What the document's fragmentation rules ask of Word that `docx` cannot
 * write.
 */
export type PackedDocxPatches = {
  /** Package as a document (the default) or a macro-free Word template. */
  fileType?: 'docx' | 'dotx';
  /** Word's two-line widow and orphan rule, on or off. */
  widowControl: boolean;
  /**
   * Adjacent space after and space before add up, rather than the larger
   * one winning.
   */
  sumAdjacentMargins: boolean;
  /**
   * The font files to embed, by family. Only the families some run, style
   * or default names are embedded.
   */
  embeddedFonts: ReadonlyArray<EmbeddedFont>;
};

/**
 * The paragraph `docx` appends after the blocks of every section but the last,
 * only to hold that section's `w:sectPr`.
 */
const CARRIER_EXP =
  /<w:p><w:pPr>(<w:sectPr>(?:(?!<\/w:sectPr>)[\s\S])*<\/w:sectPr>)<\/w:pPr><\/w:p>/g;

/**
 * A body level paragraph, as `docx` writes it, followed by a carrier. No
 * paragraph nests inside another here, so the tempered match stays inside one.
 */
const PARAGRAPH_BEFORE_CARRIER_EXP = new RegExp(
  `(<w:p(?: [^>]*)?>(?:(?!<w:p[ >])[\\s\\S])*?)(</w:p>)${CARRIER_EXP.source}`,
  'g',
);

const CARRIER_LINE_SPACING =
  '<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>';

const withSectionBreak = (paragraph: string, sectPr: string) => {
  if (paragraph.includes('<w:sectPr')) {
    return undefined;
  }
  if (paragraph.includes('</w:pPr>')) {
    return paragraph.replace('</w:pPr>', `${sectPr}</w:pPr>`);
  }
  return paragraph.replace(/^(<w:p(?: [^>]*)?>)/, `$1<w:pPr>${sectPr}</w:pPr>`);
};

/**
 * Word ends a section at the paragraph that holds its `w:sectPr`, and a
 * paragraph that holds nothing else is a line of its own. `docx` writes every
 * section break into a fresh empty paragraph, so a section that ends in a
 * continuous break spends one line of body text on it. The break moves into
 * the last paragraph of the section instead.
 *
 * A carrier that cannot be merged stays: the paragraph before it already ends
 * a section (the empty single column section that lets Word balance the
 * columns before it), or is a table, which has no `w:pPr` to hold it. Those
 * are cut to a one point line, the least a section can end in.
 */
export const inlineSectionBreaks = (documentXml: string): string => {
  const merged = documentXml.replace(
    PARAGRAPH_BEFORE_CARRIER_EXP,
    (match, paragraphStart: string, paragraphEnd: string, sectPr: string) => {
      const paragraph = withSectionBreak(paragraphStart, sectPr);
      return paragraph === undefined ? match : `${paragraph}${paragraphEnd}`;
    },
  );
  return merged.replace(
    CARRIER_EXP,
    (_match, sectPr: string) =>
      `<w:p><w:pPr>${CARRIER_LINE_SPACING}${sectPr}</w:pPr></w:p>`,
  );
};

/**
 * Word applies a two-line widow and orphan rule to a document that never
 * mentions it, but only as an implicit default. `docx` types no
 * `widowControl` for the document defaults, so it is written into the empty
 * `w:pPrDefault` here, on or off, to keep the rule from depending on one.
 */
export const writeWidowControl = (stylesXml: string, on = true): string =>
  stylesXml.replace(
    /<w:pPrDefault\/>|<w:pPrDefault><w:pPr\/><\/w:pPrDefault>/,
    `<w:pPrDefault><w:pPr>${
      on ? '<w:widowControl/>' : '<w:widowControl w:val="0"/>'
    }</w:pPr></w:pPrDefault>`,
  );

/**
 * Word adds space after and space before together when HTML paragraph auto
 * spacing is off, which is how a native ODF document spaces paragraphs.
 */
export const writeSummedMargins = (settingsXml: string): string =>
  settingsXml.replace(
    /<w:compat>/,
    '<w:compat><w:doNotUseHTMLParagraphAutoSpacing/>',
  );

const patchPart = async (
  zip: JSZip,
  path: string,
  patch: (xml: string) => string,
) => {
  const file = zip.file(path);
  if (!file) {
    throw new TypeError(`Expected the DOCX archive to contain ${path}.`);
  }
  zip.file(path, patch(await file.async('string')));
};

/** Change the main part's type without changing any of the document content. */
const writeTemplateContentType = (xml: string): string => {
  let found = false;
  const patched = xml.replace(/<Override\b[^>]*\/>/g, (override) => {
    if (!/\bPartName="\/word\/document\.xml"/.test(override)) {
      return override;
    }
    const documentType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
    if (!override.includes(`ContentType="${documentType}"`)) {
      return override;
    }
    found = true;
    return override.replace(
      `ContentType="${documentType}"`,
      'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml"',
    );
  });
  if (!found) {
    throw new TypeError(
      'Expected the DOCX main document content-type override.',
    );
  }
  return patched;
};

/** Every font the parts of the document body, styles and numbering name. */
const readUsedFontNames = async (zip: JSZip): Promise<ReadonlySet<string>> => {
  const parts = zip.file(WORD_PART_EXP);
  const xmls = await Promise.all(parts.map((part) => part.async('string')));
  return new Set(xmls.flatMap(readRunFontNames));
};

/**
 * The font table with the files of every embedded family the document uses,
 * each style in its own obfuscated part, and the setting that keeps Word
 * embedding them.
 */
const embedFonts = async (
  zip: JSZip,
  embeddedFonts: ReadonlyArray<EmbeddedFont>,
) => {
  const usedFontNames = await readUsedFontNames(zip);
  const usedFonts = embeddedFonts.filter(({ fontName }) =>
    usedFontNames.has(fontName),
  );
  if (usedFonts.length === 0) {
    return;
  }
  const { fonts, relationships, files } = toFontTableParts(usedFonts);
  await patchPart(zip, FONT_TABLE_PATH, (xml) => writeFontTable(xml, fonts));
  zip.file(FONT_TABLE_RELATIONSHIPS_PATH, relationships);
  for (const { path, data } of files) {
    zip.file(path, data);
  }
  await patchPart(zip, CONTENT_TYPES_PATH, writeFontContentType);
  await patchPart(zip, SETTINGS_PATH, writeEmbedTrueTypeFonts);
};

/**
 * The parts of a packed DOCX that `docx` has no way to write: the section
 * breaks inside the last paragraph of their section, the widow control
 * default, and the embedded fonts.
 */
export const patchPackedDocx = async (
  content: Uint8Array,
  {
    widowControl,
    sumAdjacentMargins,
    embeddedFonts,
    fileType = 'docx',
  }: PackedDocxPatches,
): Promise<Buffer> => {
  const zip = await JSZip.loadAsync(content);
  await patchPart(zip, DOCUMENT_PATH, inlineSectionBreaks);
  await patchPart(zip, STYLES_PATH, (xml) =>
    writeWidowControl(xml, widowControl),
  );
  if (sumAdjacentMargins) {
    await patchPart(zip, SETTINGS_PATH, writeSummedMargins);
  }
  await embedFonts(zip, embeddedFonts);
  if (fileType === 'dotx') {
    await patchPart(zip, CONTENT_TYPES_PATH, writeTemplateContentType);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};
