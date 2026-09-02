import type { CSSProperties } from 'react';
import { describe, expect, test } from 'vitest';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { TabSplit } from './TabSplit';

const renderTabSplit = (style?: CSSProperties) =>
  reactToHtml(
    () => (
      <ContentProvider>
        <TabSplit left="Left" right="Right" style={style} />
      </ContentProvider>
    ),
    'web',
  );

describe('TabSplit', () => {
  test('applies the layout style it needs', () => {
    const html = renderTabSplit();
    expect(html).toContain('display:flex');
    expect(html).toContain('flex-wrap:wrap');
    expect(html).toContain('justify-content:space-between');
  });

  test('lets the style prop override the layout style', () => {
    const html = renderTabSplit({ justifyContent: 'flex-start', width: '50%' });
    expect(html).toContain('justify-content:flex-start');
    expect(html).not.toContain('justify-content:space-between');
    expect(html).toContain('width:50%');
    expect(html).not.toContain('width:100%');
  });
});
