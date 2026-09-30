import JSZip from 'jszip';

const DOCUMENT_PATH = 'word/document.xml';

const STYLES_PATH = 'word/styles.xml';

const WIDOW_CONTROL = '<w:widowControl/>';

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
 * `w:pPrDefault` here to keep the rule from depending on one.
 */
export const writeWidowControl = (stylesXml: string): string =>
  stylesXml.replace(
    /<w:pPrDefault\/>|<w:pPrDefault><w:pPr\/><\/w:pPrDefault>/,
    `<w:pPrDefault><w:pPr>${WIDOW_CONTROL}</w:pPr></w:pPrDefault>`,
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

/**
 * The parts of a packed DOCX that `docx` has no way to write: the section
 * breaks inside the last paragraph of their section, and the widow control
 * default.
 */
export const patchPackedDocx = async (content: Uint8Array): Promise<Buffer> => {
  const zip = await JSZip.loadAsync(content);
  await patchPart(zip, DOCUMENT_PATH, inlineSectionBreaks);
  await patchPart(zip, STYLES_PATH, writeWidowControl);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};
