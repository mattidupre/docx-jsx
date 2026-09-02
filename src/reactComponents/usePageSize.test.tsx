import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { PageSize } from '../entities';
import {
  ReactDocumentContext,
  type ReactDocumentContextValue,
} from './entities';
import { usePageSize } from './usePageSize';

const LETTER: PageSize = { width: '8.5in', height: '11in' };

const A4: PageSize = { width: '21cm', height: '29.7cm' };

let captured: undefined | PageSize;

function PageSizeProbe() {
  captured = usePageSize();
  return null;
}

const capture = (element: ReactElement) => {
  captured = undefined;
  renderToStaticMarkup(element);
  return captured;
};

const withDocument = (value: undefined | ReactDocumentContextValue) => (
  <ReactDocumentContext.Provider value={value}>
    <PageSizeProbe />
  </ReactDocumentContext.Provider>
);

describe('usePageSize', () => {
  const SUBJECTS: ReadonlyArray<PageSize> = [LETTER, A4];

  for (const size of SUBJECTS) {
    test(`reports ${size.width} by ${size.height}`, () => {
      expect(capture(withDocument({ size }))).toEqual(size);
    });
  }

  test('throws outside a document provider', () => {
    expect(() => capture(<PageSizeProbe />)).toThrow(
      'Cannot determine page size outside document provider',
    );
  });

  test('throws when the document context is explicitly undefined', () => {
    expect(() => capture(withDocument(undefined))).toThrow(
      'Cannot determine page size outside document provider',
    );
  });
});
