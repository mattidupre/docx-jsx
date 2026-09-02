import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { DOCUMENT_TYPES } from '../entities';
import {
  ReactDocumentContext,
  ReactEnvironmentContext,
  type ReactEnvironmentContextValue,
} from './entities';
import { useEnvironment } from './useEnvironment';

const DOCUMENT_CONTEXT = { size: { width: '8.5in', height: '11in' } } as const;

let captured: undefined | ReactEnvironmentContextValue;

function EnvironmentProbe({ disableAssert }: { disableAssert?: boolean }) {
  captured = useEnvironment({ disableAssert });
  return null;
}

/** Reads the hook's value rather than the markup React escapes it into. */
const capture = (element: ReactElement) => {
  captured = undefined;
  renderToStaticMarkup(element);
  return captured;
};

const withEnvironment = (
  environment: undefined | ReactEnvironmentContextValue,
  children: ReactNode,
) => (
  <ReactEnvironmentContext.Provider value={environment}>
    {children}
  </ReactEnvironmentContext.Provider>
);

describe('useEnvironment', () => {
  test('defaults to the web target outside every provider', () => {
    expect(capture(<EnvironmentProbe disableAssert />)).toEqual({
      documentType: 'web',
      isPreview: false,
    });
  });

  for (const documentType of DOCUMENT_TYPES) {
    test(`reports the ${documentType} target from the environment context`, () => {
      expect(
        capture(
          withEnvironment({ documentType }, <EnvironmentProbe disableAssert />),
        ),
      ).toEqual({ documentType, isPreview: false });
    });
  }

  test('reports isPreview from the environment context', () => {
    expect(
      capture(
        withEnvironment(
          { documentType: 'web', isPreview: true },
          <EnvironmentProbe disableAssert />,
        ),
      ),
    ).toEqual({ documentType: 'web', isPreview: true });
  });

  test('an undefined context value falls back to the defaults', () => {
    expect(
      capture(withEnvironment(undefined, <EnvironmentProbe disableAssert />)),
    ).toEqual({ documentType: 'web', isPreview: false });
  });

  // The assertion is the contract for library consumers, who call
  // `useEnvironment()` with no options. Every internal caller opts out because
  // library components must also work under a bare ContentProvider.
  test('asserts a document provider is present by default', () => {
    expect(() => capture(<EnvironmentProbe />)).toThrow(
      'Document Context not found.',
    );
  });

  test('does not assert inside a document provider', () => {
    expect(
      capture(
        <ReactDocumentContext.Provider value={DOCUMENT_CONTEXT}>
          <EnvironmentProbe />
        </ReactDocumentContext.Provider>,
      ),
    ).toEqual({ documentType: 'web', isPreview: false });
  });

  test('disableAssert only silences the assertion, not the value', () => {
    expect(
      capture(
        <ReactDocumentContext.Provider value={DOCUMENT_CONTEXT}>
          {withEnvironment({ documentType: 'docx' }, <EnvironmentProbe />)}
        </ReactDocumentContext.Provider>,
      ),
    ).toEqual(
      capture(
        withEnvironment(
          { documentType: 'docx' },
          <EnvironmentProbe disableAssert />,
        ),
      ),
    );
  });
});
