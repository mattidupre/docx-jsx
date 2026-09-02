import { describe, expect, test, vi } from 'vitest';
import type { DocumentType } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { PageCount } from './PageCount';
import { PageNumber } from './PageNumber';

const renderCounter = (
  Counter: typeof PageNumber | typeof PageCount,
  documentType: DocumentType,
) => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    const html = reactToHtml(
      () => (
        <ContentProvider>
          <Counter />
        </ContentProvider>
      ),
      documentType,
    );
    return { html, warnings: warn.mock.calls.flat() };
  } finally {
    warn.mockRestore();
  }
};

describe('page counters', () => {
  const SUBJECTS = [
    [PageNumber, 'PageNumber will be ignored in web output.'],
    [PageCount, 'PageCount will be ignored in web output.'],
  ] as const;

  for (const [Counter, message] of SUBJECTS) {
    test(`${Counter.name} names itself when warning about the web target`, () => {
      expect(renderCounter(Counter, 'web').warnings).toEqual([message]);
    });

    test(`${Counter.name} does not warn about the pdf target`, () => {
      expect(renderCounter(Counter, 'pdf').warnings).toEqual([]);
    });
  }
});
