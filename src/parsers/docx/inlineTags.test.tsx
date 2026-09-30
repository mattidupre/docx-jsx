import { describe, expect, it } from 'vitest';
import { DocumentProvider, Stack } from '../../reactComponents';
import { mockFonts } from '../../fixtures/mockFonts';
import { reactToDocx } from '../../reactToDocx';
import {
  attribute,
  findAll,
  inspectDocx,
  textOf,
  type XmlNode,
} from '../../fixtures/docxInspect';

function InlineTagsDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>
          <b>b</b> <strong>strong</strong> <i>i</i> <em>em</em> <u>u</u>{' '}
          <s>s</s> <sup>sup</sup> <sub>sub</sub>
        </p>
      </Stack>
    </DocumentProvider>
  );
}

/** The run properties Word gives each tag, by the text of the run. */
const readRunProperties = async () => {
  const { document } = await inspectDocx(
    await reactToDocx(InlineTagsDocument, { fonts: mockFonts }),
  );
  const runs = new Map<string, XmlNode>();
  for (const run of findAll(document, 'w:r')) {
    runs.set(textOf(run).trim(), run);
  }
  const runOf = (text: string) => {
    const run = runs.get(text);
    if (!run) {
      throw new Error(`word/document.xml has no run reading "${text}".`);
    }
    return run;
  };
  const has = (text: string, tagName: string) =>
    findAll(runOf(text), tagName).length > 0;
  const vertAlign = (text: string) => {
    const [node] = findAll(runOf(text), 'w:vertAlign');
    return node && attribute(node, 'w:val');
  };
  return { has, vertAlign };
};

/**
 * The browser styles these tags from the same `INTRINSIC_TYPOGRAPHY_OPTIONS`
 * table (`lib/styles.ts`), so every tag a browser formats has to be formatted
 * in Word as well.
 */
describe('inline formatting tags in a packed DOCX', () => {
  it('sets b and strong in bold', async () => {
    const { has } = await readRunProperties();
    expect(has('b', 'w:b')).toBe(true);
    expect(has('strong', 'w:b')).toBe(true);
  });

  it('sets i and em in italics', async () => {
    const { has } = await readRunProperties();
    expect(has('i', 'w:i')).toBe(true);
    expect(has('em', 'w:i')).toBe(true);
  });

  it('underlines u and strikes s through', async () => {
    const { has } = await readRunProperties();
    expect(has('u', 'w:u')).toBe(true);
    expect(has('s', 'w:strike')).toBe(true);
  });

  it('raises sup and lowers sub', async () => {
    const { vertAlign } = await readRunProperties();
    expect(vertAlign('sup')).toBe('superscript');
    expect(vertAlign('sub')).toBe('subscript');
  });
});
