import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import {
  type PageMargin,
  type StackConfig,
  assignStackOptions,
} from '../entities';
import { ReactStackContext } from './entities';
import { usePageMargins } from './usePageMargins';

let captured: undefined | PageMargin;

function PageMarginsProbe() {
  captured = usePageMargins();
  return null;
}

const capture = (element: ReactElement) => {
  captured = undefined;
  renderToStaticMarkup(element);
  return captured;
};

const withStack = (value: undefined | StackConfig) => (
  <ReactStackContext.Provider value={value}>
    <PageMarginsProbe />
  </ReactStackContext.Provider>
);

describe('usePageMargins', () => {
  test('reports the default margins of a bare stack', () => {
    expect(capture(withStack(assignStackOptions()))).toEqual({
      header: '0.25in',
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      footer: '0.25in',
      left: '0.5in',
    });
  });

  test('reports a partial margin merged onto the defaults', () => {
    expect(
      capture(withStack(assignStackOptions({ margin: { top: '2in' } }))),
    ).toMatchObject({ top: '2in', bottom: '0.5in' });
  });

  test('reports fully custom margins', () => {
    const margin: PageMargin = {
      header: '1cm',
      top: '2cm',
      right: '3cm',
      bottom: '4cm',
      footer: '5cm',
      left: '6cm',
    };
    expect(capture(withStack(assignStackOptions({ margin })))).toEqual(margin);
  });

  test('throws outside a stack', () => {
    expect(() => capture(<PageMarginsProbe />)).toThrow(
      'Cannot determine page margins outside stack',
    );
  });

  test('throws when the stack context is explicitly undefined', () => {
    expect(() => capture(withStack(undefined))).toThrow(
      'Cannot determine page margins outside stack',
    );
  });
});
