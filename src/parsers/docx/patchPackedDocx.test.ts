import { describe, expect, it } from 'vitest';
import { inlineSectionBreaks, writeWidowControl } from './patchPackedDocx';

const SECT_PR = '<w:sectPr><w:cols w:num="2"/></w:sectPr>';

const CARRIER = `<w:p><w:pPr>${SECT_PR}</w:pPr></w:p>`;

const SHRUNK_CARRIER = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${SECT_PR}</w:pPr></w:p>`;

describe('inlineSectionBreaks', () => {
  it('moves the break into the paragraph before it', () => {
    expect(
      inlineSectionBreaks(`<w:p><w:r><w:t>Text</w:t></w:r></w:p>${CARRIER}`),
    ).toBe(`<w:p><w:pPr>${SECT_PR}</w:pPr><w:r><w:t>Text</w:t></w:r></w:p>`);
  });

  it('appends to the properties the paragraph already has', () => {
    expect(
      inlineSectionBreaks(
        `<w:p><w:pPr><w:keepNext/></w:pPr><w:r><w:t>Text</w:t></w:r></w:p>${CARRIER}`,
      ),
    ).toBe(
      `<w:p><w:pPr><w:keepNext/>${SECT_PR}</w:pPr><w:r><w:t>Text</w:t></w:r></w:p>`,
    );
  });

  it('shrinks a carrier that follows a section break to a one point line', () => {
    expect(
      inlineSectionBreaks(
        `<w:p><w:r><w:t>Text</w:t></w:r></w:p>${CARRIER}${CARRIER}`,
      ),
    ).toBe(
      `<w:p><w:pPr>${SECT_PR}</w:pPr><w:r><w:t>Text</w:t></w:r></w:p>${SHRUNK_CARRIER}`,
    );
  });

  it('keeps a carrier after a table, at one point', () => {
    expect(inlineSectionBreaks(`<w:tbl></w:tbl>${CARRIER}`)).toBe(
      `<w:tbl></w:tbl>${SHRUNK_CARRIER}`,
    );
  });

  it('does not merge into a paragraph inside a table cell', () => {
    const table =
      '<w:tbl><w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tbl>';
    expect(inlineSectionBreaks(`${table}${CARRIER}`)).toBe(
      `${table}${SHRUNK_CARRIER}`,
    );
  });
});

describe('writeWidowControl', () => {
  it('fills the empty paragraph defaults', () => {
    expect(
      writeWidowControl('<w:docDefaults><w:pPrDefault/></w:docDefaults>'),
    ).toBe(
      '<w:docDefaults><w:pPrDefault><w:pPr><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults>',
    );
  });
});
