import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { build } from './demo/build';
import { findAll, inspectDocx, sections, textOf } from './fixtures/docxInspect';

describe('demo build', () => {
  it('renders every demo document to every target', async () => {
    const results = await build({ silent: true });

    expect(
      results
        .filter(({ error }) => error !== undefined)
        .map(
          ({ baseName, target, error }) => `${baseName}.${target}: ${error}`,
        ),
    ).toEqual([]);

    expect(results.map(({ target }) => target).sort()).toEqual([
      'docx',
      'docx',
      'dotx',
      'html',
      'html',
      'html',
      'pdf',
      'pdf',
      'pdf',
    ]);

    for (const { filePath, byteLength } of results) {
      expect(byteLength, filePath).toBeGreaterThan(0);
    }

    const starterFile = results.find(
      ({ baseName, target }) =>
        baseName === 'ReportStarter' && target === 'dotx',
    );
    const filledFile = results.find(
      ({ baseName, target }) =>
        baseName === 'ReportFilled' && target === 'docx',
    );
    if (!starterFile || !filledFile)
      throw new Error('Missing Word report pair');
    const starter = await inspectDocx(await readFile(starterFile.filePath));
    const filled = await inspectDocx(await readFile(filledFile.filePath));
    expect(textOf(starter.document)).toContain('[Client name]');
    expect(textOf(starter.document)).toContain('[Project or workstream]');
    expect(textOf(starter.document)).toContain('[Next action]');
    expect(findAll(starter.document, 'w15:repeatingSection')).toHaveLength(2);
    expect(findAll(starter.document, 'w15:repeatingSectionItem')).toHaveLength(
      2,
    );
    expect(textOf(filled.document)).toContain('Acme Studio');
    expect(textOf(filled.document)).toContain('Customer research');
    expect(textOf(filled.document)).toContain('Product prototype');
    expect(textOf(filled.document)).not.toContain('[Client name]');
    expect(starter.styles).toEqual(filled.styles);
    expect(sections(starter.document)).toEqual(sections(filled.document));
    expect(starter.headers).toEqual(filled.headers);
    expect(starter.footers).toEqual(filled.footers);
  });
});
