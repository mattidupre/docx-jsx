import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import { decodeElementData, resolveRemSize } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { DEFAULT_DIVIDER_OPTIONS, Divider, type DividerProps } from './Divider';

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

const renderDivider = (
  props: DividerProps = {},
  documentType?: 'web' | 'docx',
) => render(<Divider {...props} />, documentType);

describe('Divider', () => {
  test('draws the rule with a border rather than an hr', () => {
    const html = renderDivider({
      color: '#ff0000',
      thickness: '2px',
      spaceBefore: '1rem',
      spaceAfter: '0.5rem',
    });

    expect(html).toContain('<div');
    expect(html).not.toContain('<hr');
    expect(html).toContain('height:0');
    expect(html).toContain('border-top-width:2px');
    expect(html).toContain('border-top-style:solid');
    expect(html).toContain('border-top-color:#ff0000');
    // `rem` is resolved against the 16px root the DOCX target uses, so a host
    // page's root font size cannot move the rule.
    expect(html).toContain('margin-top:16px');
    expect(html).toContain('margin-bottom:8px');
  });

  test('falls back to the documented defaults', () => {
    const html = renderDivider();

    expect(html).toContain(
      `border-top-width:${DEFAULT_DIVIDER_OPTIONS.thickness}`,
    );
    expect(html).toContain(`border-top-color:${DEFAULT_DIVIDER_OPTIONS.color}`);
    expect(html).toContain(
      `margin-top:${resolveRemSize(DEFAULT_DIVIDER_OPTIONS.spaceBefore)}`,
    );
    expect(html).toContain(
      `margin-bottom:${resolveRemSize(DEFAULT_DIVIDER_OPTIONS.spaceAfter)}`,
    );
  });

  test('spans a percentage of the content width when asked to', () => {
    expect(renderDivider({ width: 40 })).toContain(';width:40%');
    // `border-top-width` is not the rule's own width.
    expect(renderDivider()).not.toMatch(/;width:/);
  });

  test('encodes the element data every non-web target reads', () => {
    const html = renderDivider(
      {
        color: '#123456',
        thickness: '3px',
        spaceBefore: '10px',
        spaceAfter: '20px',
        width: 50,
      },
      'docx',
    );

    expect(decodeAttributes(html)).toEqual({
      elementType: 'divider',
      elementOptions: {
        color: '#123456',
        thickness: '3px',
        spaceBefore: '10px',
        spaceAfter: '20px',
        width: 50,
      },
      contentOptions: {},
      variant: undefined,
    });
  });
});
