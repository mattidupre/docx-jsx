import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import { decodeElementData } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { Spacer } from './Spacer';

const render = (element: ReactElement, documentType: 'web' | 'docx' = 'web') =>
  reactToHtml(() => <ContentProvider>{element}</ContentProvider>, documentType);

const decodeAttributes = (html: string) => {
  const properties: Record<string, string> = {};
  for (const [, name, value] of html.matchAll(
    /(data-matti-docs-[a-z-]+)="([^"]*)"/g,
  )) {
    properties[name] = value;
  }
  return decodeElementData({ properties });
};

describe('Spacer', () => {
  test('reserves the height it was given and nothing else', () => {
    const html = render(<Spacer height="0.5in" />);

    expect(html).toContain('<div');
    expect(html).toContain('height:0.5in');
    // Margins would collapse into the neighbours and make the gap depend on
    // what surrounds it; Word's exact line spacing does not.
    expect(html).toContain('margin-top:0');
    expect(html).toContain('margin-bottom:0');
  });

  test('encodes the element data every non-web target reads', () => {
    const html = render(<Spacer height="24pt" />, 'docx');

    expect(decodeAttributes(html)).toEqual({
      elementType: 'spacer',
      elementOptions: { height: '24pt' },
      contentOptions: {},
      variant: undefined,
    });
  });
});
