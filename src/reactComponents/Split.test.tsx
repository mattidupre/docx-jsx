import type { CSSProperties, ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { Split } from './Split';

const renderSplit = (props: {
  left: ReactNode;
  right: ReactNode;
  style?: CSSProperties;
}) =>
  reactToHtml(
    () => (
      <ContentProvider>
        <Split {...props} />
      </ContentProvider>
    ),
    'web',
  );

const countDivs = (html: string) => html.split('<div').length - 1;

describe('Split', () => {
  const SIDE_SUBJECTS = [
    [null, null],
    ['Left', 'Right'],
    [<p key="left">Left</p>, <p key="right">Right</p>],
    [
      <>
        <p key="a">A</p>
        <p key="b">B</p>
      </>,
      null,
    ],
  ] as const;

  for (const [left, right] of SIDE_SUBJECTS) {
    test(`wraps both sides in exactly one element each`, () => {
      // One element for the split itself plus one wrapper per side, whatever
      // the sides render.
      expect(countDivs(renderSplit({ left, right }))).toBe(3);
    });
  }

  test('applies the layout style it needs', () => {
    const html = renderSplit({ left: 'Left', right: 'Right' });
    expect(html).toContain('width:100%');
    expect(html).toContain('display:flex');
    expect(html).toContain('justify-content:space-between');
  });

  test('lets the style prop override the layout style', () => {
    const html = renderSplit({
      left: 'Left',
      right: 'Right',
      style: { justifyContent: 'flex-start', width: '50%' },
    });
    expect(html).toContain('justify-content:flex-start');
    expect(html).not.toContain('justify-content:space-between');
    expect(html).toContain('width:50%');
    expect(html).not.toContain('width:100%');
  });
});
