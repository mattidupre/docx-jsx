import { describe, expect, test } from 'vitest';
import { DOCUMENT_TYPES, type DocumentType } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { IfEnvironment, type IfEnvironmentProps } from './IfEnvironment';

const renderIf = (
  props: Omit<IfEnvironmentProps, 'children'>,
  documentType: DocumentType,
) =>
  reactToHtml(
    () => <IfEnvironment {...props}>shown</IfEnvironment>,
    documentType,
  );

describe('IfEnvironment', () => {
  for (const target of DOCUMENT_TYPES) {
    for (const documentType of DOCUMENT_TYPES) {
      const isMatch = target === documentType;

      test(`documentType=${documentType} ${
        isMatch ? 'renders' : 'hides'
      } children in the ${target} target`, () => {
        expect(renderIf({ documentType }, target)).toEqual(
          isMatch ? 'shown' : '',
        );
      });

      test(`not documentType=${documentType} ${
        isMatch ? 'hides' : 'renders'
      } children in the ${target} target`, () => {
        expect(renderIf({ documentType, not: true }, target)).toEqual(
          isMatch ? '' : 'shown',
        );
      });
    }
  }

  test('renders children when no condition is given', () => {
    // An empty condition matches every environment.
    expect(renderIf({}, 'web')).toEqual('shown');
    expect(renderIf({ not: true }, 'web')).toEqual('');
  });

  test('matches isPreview, which defaults to false outside a preview', () => {
    expect(renderIf({ isPreview: false }, 'web')).toEqual('shown');
    expect(renderIf({ isPreview: true }, 'web')).toEqual('');
    expect(renderIf({ isPreview: true, not: true }, 'web')).toEqual('shown');
  });

  test('requires every given condition to match', () => {
    expect(renderIf({ documentType: 'pdf', isPreview: false }, 'pdf')).toEqual(
      'shown',
    );
    expect(renderIf({ documentType: 'pdf', isPreview: true }, 'pdf')).toEqual(
      '',
    );
  });

  test('does not require a document provider', () => {
    // The condition is evaluated with the environment assertion disabled, so a
    // bare IfEnvironment renders outside DocumentProvider.
    expect(() => renderIf({ documentType: 'web' }, 'web')).not.toThrow();
  });
});
