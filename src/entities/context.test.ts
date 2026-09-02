import { describe, expect, test } from 'vitest';
import { assignElementsContext } from './context';

const DEFAULT_DOCUMENT = {
  size: { width: '8.5in', height: '11in' },
  variants: {},
  prefixes: {
    elementClassName: 'matti-docs-element',
    variantClassName: 'matti-docs-variant',
    cssVariable: 'matti-docs',
  },
};

const DEFAULT_STACK = {
  margin: {
    header: '0.25in',
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    footer: '0.25in',
    left: '0.5in',
  },
  continuous: false,
  columns: { columnCount: 1, columnGap: '0.5in' },
};

describe('assignElementsContext', () => {
  test('fills every key with a default', () => {
    const context = assignElementsContext();
    expect(context).toEqual({
      document: DEFAULT_DOCUMENT,
      stack: DEFAULT_STACK,
      contentOptions: {},
      isInsideParagraph: false,
      isInsideColumn: false,
      isHtmlRaw: false,
      isInsideHyperlink: false,
      list: {
        level: -1,
        instance: -1,
        format: 'bullet',
        start: 1,
        indent: undefined,
      },
      variant: undefined,
    });
    // `variant` is declared even when it has no value, so consumers can
    // destructure it without an index signature.
    expect(Object.keys(context)).toContain('variant');
  });

  test('accepts undefined arguments', () => {
    expect(assignElementsContext(undefined, undefined)).toEqual(
      assignElementsContext(),
    );
  });

  test('mutates and returns the first argument so callers can accumulate', () => {
    // mapHtmlToDocument reads the context object again after each call.
    const context = assignElementsContext();
    expect(assignElementsContext(context, { isHtmlRaw: true })).toBe(context);
    expect(context.isHtmlRaw).toBe(true);
  });

  test('inherits every value from a parent context', () => {
    const parent = assignElementsContext(
      {},
      {
        document: { size: { width: '5in', height: '7in' } },
        stack: { continuous: true },
        contentOptions: { fontWeight: 'bold' },
        variant: 'heading1',
        isInsideParagraph: true,
      },
    );
    const child = assignElementsContext({}, parent);

    expect(child.document.size).toEqual({ width: '5in', height: '7in' });
    expect(child.stack.continuous).toBe(true);
    expect(child.contentOptions).toEqual({ fontWeight: 'bold' });
    expect(child.variant).toEqual('heading1');
    expect(child.isInsideParagraph).toBe(true);
  });

  test('never aliases the parent context it inherits from', () => {
    const parent = assignElementsContext();
    const child = assignElementsContext({}, parent);

    expect(child).not.toBe(parent);
    expect(child.document).not.toBe(parent.document);
    expect(child.document.size).not.toBe(parent.document.size);
    expect(child.document.prefixes).not.toBe(parent.document.prefixes);
    expect(child.document.variants).not.toBe(parent.document.variants);
    expect(child.stack).not.toBe(parent.stack);
    expect(child.stack.margin).not.toBe(parent.stack.margin);
    expect(child.contentOptions).not.toBe(parent.contentOptions);
    expect(child.list).not.toBe(parent.list);
  });

  test('nesting a list does not rewrite the parent list level', () => {
    // `mergeWithDefault` used to return the parent's `list` object, so
    // incrementing the level on a child <ul> also incremented its parent's.
    const parent = assignElementsContext();
    const child = assignElementsContext({}, parent);

    assignElementsContext(child, { list: { level: child.list.level + 1 } });

    expect(child.list.level).toBe(0);
    expect(parent.list.level).toBe(-1);
  });

  test('keeps the indent of the list above when a nested one does not state its own', () => {
    // A nested plain `<ul>` names no indent, and inheriting the one the list
    // around it uses is what keeps the steps even.
    const parent = assignElementsContext(
      {},
      { list: { level: 0, instance: 1, format: 'decimal', indent: '0.25in' } },
    );
    const child = assignElementsContext({}, parent);
    assignElementsContext(child, {
      list: { level: 1, instance: 2, format: 'bullet', start: 1 },
    });

    expect(child.list).toEqual({
      level: 1,
      instance: 2,
      format: 'bullet',
      start: 1,
      indent: '0.25in',
    });
  });

  test('lets the last defined variant win', () => {
    expect(
      assignElementsContext({}, { variant: 'a' }, { variant: 'b' }).variant,
    ).toEqual('b');
    expect(assignElementsContext({}, { variant: 'a' }, {}).variant).toEqual(
      'a',
    );
    expect(assignElementsContext({}, {}).variant).toBeUndefined();
  });

  const FLAGS = [
    'isInsideParagraph',
    'isInsideColumn',
    'isHtmlRaw',
    'isInsideHyperlink',
  ] as const;

  for (const flag of FLAGS) {
    test(`${flag} defaults to false and turns on`, () => {
      expect(assignElementsContext()[flag]).toBe(false);
      expect(assignElementsContext({}, { [flag]: true })[flag]).toBe(true);
    });

    test(`${flag} cannot be turned back off by a descendant`, () => {
      // The flags describe an enclosing element, so once a subtree is inside a
      // paragraph/column/raw block no child can claim it is not.
      expect(
        assignElementsContext({}, { [flag]: true }, { [flag]: false })[flag],
      ).toBe(true);
    });
  }

  test('merges document and stack options across arguments', () => {
    const context = assignElementsContext(
      {},
      { document: { prefixes: 'myapp' }, stack: { margin: { top: '1in' } } },
      { stack: { margin: { left: '2in' } } },
    );

    expect(context.document.prefixes).toEqual({
      elementClassName: 'myapp-element',
      variantClassName: 'myapp-variant',
      cssVariable: 'myapp',
    });
    expect(context.stack.margin).toEqual({
      ...DEFAULT_STACK.margin,
      top: '1in',
      left: '2in',
    });
  });

  test('merges content options across arguments', () => {
    expect(
      assignElementsContext(
        {},
        { contentOptions: { fontWeight: 'bold', color: 'red' } },
        { contentOptions: { color: 'blue' } },
      ).contentOptions,
    ).toEqual({ fontWeight: 'bold', color: 'blue' });
  });
});
