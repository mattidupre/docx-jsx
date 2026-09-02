import { describe, expect, it } from 'vitest';
import { build } from './demo/build';

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
      'html',
      'pdf',
    ]);

    for (const { filePath, byteLength } of results) {
      expect(byteLength, filePath).toBeGreaterThan(0);
    }
  });
});
