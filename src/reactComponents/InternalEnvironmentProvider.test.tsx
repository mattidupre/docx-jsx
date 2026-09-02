import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { DOCUMENT_TYPES, type DocumentType } from '../entities';
import {
  ReactEnvironmentContext,
  type ReactEnvironmentContextValue,
} from './entities';
import { InternalEnvironmentProvider } from './InternalEnvironmentProvider';

let captured: undefined | ReactEnvironmentContextValue;

function EnvironmentProbe() {
  return (
    <ReactEnvironmentContext.Consumer>
      {(value) => {
        captured = value;
        return null;
      }}
    </ReactEnvironmentContext.Consumer>
  );
}

const capture = (element: ReactElement) => {
  captured = undefined;
  renderToStaticMarkup(element);
  return captured;
};

describe('InternalEnvironmentProvider', () => {
  for (const documentType of DOCUMENT_TYPES) {
    test(`publishes the ${documentType} target`, () => {
      expect(
        capture(
          <InternalEnvironmentProvider documentType={documentType}>
            <EnvironmentProbe />
          </InternalEnvironmentProvider>,
        ),
      ).toEqual({ documentType, isPreview: undefined });
    });
  }

  test('publishes isPreview alongside the target', () => {
    expect(
      capture(
        <InternalEnvironmentProvider documentType="web" isPreview>
          <EnvironmentProbe />
        </InternalEnvironmentProvider>,
      ),
    ).toEqual({ documentType: 'web', isPreview: true });
  });

  test('keeps the parent value when a nested provider repeats it', () => {
    expect(
      capture(
        <InternalEnvironmentProvider documentType="pdf" isPreview>
          <InternalEnvironmentProvider documentType="pdf">
            <EnvironmentProbe />
          </InternalEnvironmentProvider>
        </InternalEnvironmentProvider>,
      ),
    ).toEqual({ documentType: 'pdf', isPreview: true });
  });

  test('lets a nested provider add a property the parent left undefined', () => {
    expect(
      capture(
        <InternalEnvironmentProvider documentType="pdf">
          <InternalEnvironmentProvider documentType="pdf" isPreview>
            <EnvironmentProbe />
          </InternalEnvironmentProvider>
        </InternalEnvironmentProvider>,
      ),
    ).toEqual({ documentType: 'pdf', isPreview: true });
  });

  const CONFLICTS: ReadonlyArray<[DocumentType, DocumentType]> = [
    ['web', 'docx'],
    ['docx', 'pdf'],
    ['pdf', 'web'],
  ];

  for (const [outer, inner] of CONFLICTS) {
    test(`refuses to override ${outer} with ${inner}`, () => {
      expect(() =>
        capture(
          <InternalEnvironmentProvider documentType={outer}>
            <InternalEnvironmentProvider documentType={inner}>
              <EnvironmentProbe />
            </InternalEnvironmentProvider>
          </InternalEnvironmentProvider>,
        ),
      ).toThrow('Do not override documentType.');
    });
  }

  test('refuses to override isPreview', () => {
    expect(() =>
      capture(
        <InternalEnvironmentProvider documentType="web" isPreview>
          <InternalEnvironmentProvider documentType="web" isPreview={false}>
            <EnvironmentProbe />
          </InternalEnvironmentProvider>
        </InternalEnvironmentProvider>,
      ),
    ).toThrow('Do not override isPreview.');
  });
});
