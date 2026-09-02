import { afterEach, describe, expect, test, vi } from 'vitest';
import { getElementInnerSize, getElementOuterSize } from './elements';

/**
 * The suite runs without a DOM, so the two size helpers are exercised against
 * the handful of properties they actually read. `createElementChild` needs a
 * real `document` (element namespaces cannot be faked meaningfully) and is not
 * covered here.
 */
type ElementBox = {
  isConnected: boolean;
  offsetWidth: number;
  offsetHeight: number;
  clientWidth: number;
  clientHeight: number;
};

const createElement = (box: Partial<ElementBox>) =>
  ({
    isConnected: true,
    offsetWidth: 0,
    offsetHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
    ...box,
  }) as unknown as HTMLElement;

const stubComputedStyle = (style: Record<string, string>) => {
  vi.stubGlobal('window', { getComputedStyle: () => style });
};

const MARGINS = {
  marginTop: '1px',
  marginRight: '2px',
  marginBottom: '4px',
  marginLeft: '8px',
};

const PADDING = {
  paddingTop: '1px',
  paddingRight: '2px',
  paddingBottom: '4px',
  paddingLeft: '8px',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getElementOuterSize', () => {
  test('adds the horizontal and vertical margins to the offset box', () => {
    stubComputedStyle(MARGINS);
    expect(
      getElementOuterSize(
        createElement({ offsetWidth: 100, offsetHeight: 50 }),
      ),
    ).toEqual({ width: 110, height: 55 });
  });

  test('subtracts negative margins', () => {
    stubComputedStyle({ ...MARGINS, marginLeft: '-8px' });
    expect(
      getElementOuterSize(
        createElement({ offsetWidth: 100, offsetHeight: 50 }),
      ),
    ).toEqual({ width: 94, height: 55 });
  });

  test('returns undefined for a detached element', () => {
    stubComputedStyle(MARGINS);
    expect(
      getElementOuterSize(
        createElement({ isConnected: false, offsetWidth: 100 }),
      ),
    ).toBeUndefined();
  });
});

describe('getElementInnerSize', () => {
  test('subtracts the horizontal and vertical padding from the client box', () => {
    stubComputedStyle(PADDING);
    expect(
      getElementInnerSize(
        createElement({ clientWidth: 100, clientHeight: 50 }),
      ),
    ).toEqual({ width: 90, height: 45 });
  });

  test('returns undefined for a detached element', () => {
    stubComputedStyle(PADDING);
    expect(
      getElementInnerSize(
        createElement({ isConnected: false, clientWidth: 100 }),
      ),
    ).toBeUndefined();
  });
});
