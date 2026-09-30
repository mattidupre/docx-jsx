import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { reactToDocx } from './reactToDocx';
import { mockFonts } from './fixtures/mockFonts';
import { VISUAL_DOCUMENTS } from './fixtures/visualDocuments';

const PUBLIC_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mockAssets',
);

/**
 * The parts of a package that carry what the markup means. `docProps` holds
 * timestamps and `[Content_Types].xml`/relationships only list the parts, so
 * they would change on every run or say nothing a part snapshot doesn't.
 */
const MEANINGFUL_PART =
  /^word\/(document|styles|numbering|header\d+|footer\d+)\.xml$/;

/** `docx` names every hyperlink relationship with a random id. */
const RANDOM_RELATIONSHIP_ID = /rId[\w-]{16,}/g;

/** Random relationship ids renumbered in order of first appearance. */
const canonicalizeRelationshipIds = (xml: string) => {
  const ids = new Map<string, string>();
  return xml.replace(RANDOM_RELATIONSHIP_ID, (id) => {
    const canonicalId = ids.get(id) ?? `rIdRandom${ids.size + 1}`;
    ids.set(id, canonicalId);
    return canonicalId;
  });
};

/**
 * The browser styling layer is rebuilt independently of the DOCX mapper, which
 * reads only tag names and the `data-matti-docs-*` attributes. These snapshots
 * pin the Word output of every visual fixture byte for byte, so a styling
 * change that leaks into the markup contract fails here rather than in Word.
 */
describe('reactToDocx fixture parts', () => {
  for (const { name, Document } of VISUAL_DOCUMENTS) {
    it(`keeps the ${name} fixture's Word parts unchanged`, async () => {
      const docx = await reactToDocx(Document, {
        fonts: mockFonts,
        publicDirectory: PUBLIC_DIRECTORY,
      });
      const zip = await JSZip.loadAsync(docx);
      const partNames = Object.keys(zip.files)
        .filter((partName) => MEANINGFUL_PART.test(partName))
        .sort();
      expect(partNames).toContain('word/document.xml');
      for (const partName of partNames) {
        const part = zip.file(partName);
        if (!part) {
          throw new Error(`The package lists ${partName} but holds no file.`);
        }
        const xml = canonicalizeRelationshipIds(await part.async('string'));
        await expect(xml).toMatchFileSnapshot(
          join('__snapshots__', 'docx', name, partName.replace(/^word\//, '')),
        );
      }
    });
  }
});
