import { describe, expect, test } from 'vitest';
import {
  type LayoutOptions,
  type PrefixesConfig,
  type PrefixesOptions,
  type StackOptions,
  assignDocumentOptions,
  assignLayoutOptions,
  assignPrefixesOptions,
  assignStackOptions,
  createDefaultLayoutConfig,
  mapLayoutKeys,
} from './options';

/**
 * `PrefixesConfig` values are `Lowercase<string>`, so the mixed-case values a
 * JavaScript caller can still hand over are unrepresentable without a cast.
 */
const asPrefix = (value: string) => value as PrefixesConfig['cssVariable'];

const DEFAULT_PREFIXES: PrefixesConfig = {
  elementClassName: 'matti-docs-element',
  variantClassName: 'matti-docs-variant',
  cssVariable: 'matti-docs',
};

const DEFAULT_MARGIN = {
  header: '0.25in',
  top: '0.5in',
  right: '0.5in',
  bottom: '0.5in',
  footer: '0.25in',
  left: '0.5in',
};

const argsToString = (args: ReadonlyArray<unknown>) =>
  args.map((arg) => JSON.stringify(arg)).join(',');

describe('assignPrefixesOptions', () => {
  const SUBJECTS: ReadonlyArray<
    [ReadonlyArray<undefined | PrefixesOptions>, PrefixesConfig]
  > = [
    // No arguments and undefined arguments both fall back to DEFAULT_PREFIX.
    [[], DEFAULT_PREFIXES],
    [[undefined], DEFAULT_PREFIXES],
    [[undefined, undefined], DEFAULT_PREFIXES],
    [[{}], DEFAULT_PREFIXES],

    // A string shorthand names all three prefixes and is lower-cased.
    [
      ['MyApp'],
      {
        elementClassName: 'myapp-element',
        variantClassName: 'myapp-variant',
        cssVariable: 'myapp',
      },
    ],

    // A partial object only overrides the keys it defines, and is lower-cased.
    [
      [{ cssVariable: asPrefix('Vars') }],
      { ...DEFAULT_PREFIXES, cssVariable: 'vars' },
    ],
    [
      [
        {
          elementClassName: asPrefix('El'),
          variantClassName: asPrefix('Var'),
        },
      ],
      {
        elementClassName: 'el',
        variantClassName: 'var',
        cssVariable: 'matti-docs',
      },
    ],

    // Explicit undefined values never clobber an earlier value.
    [
      [{ cssVariable: 'vars' }, { cssVariable: undefined }],
      { ...DEFAULT_PREFIXES, cssVariable: 'vars' },
    ],

    // Later arguments win, and a partial does not reset its predecessor.
    [
      ['myapp', { cssVariable: 'vars' }],
      {
        elementClassName: 'myapp-element',
        variantClassName: 'myapp-variant',
        cssVariable: 'vars',
      },
    ],
    [
      [{ cssVariable: 'vars' }, 'myapp'],
      {
        elementClassName: 'myapp-element',
        variantClassName: 'myapp-variant',
        cssVariable: 'myapp',
      },
    ],
    [
      [{}, undefined, { variantClassName: 'v' }],
      { ...DEFAULT_PREFIXES, variantClassName: 'v' },
    ],
    [
      [DEFAULT_PREFIXES, { cssVariable: 'vars' }],
      { ...DEFAULT_PREFIXES, cssVariable: 'vars' },
    ],
  ];

  for (const [args, result] of SUBJECTS) {
    test(`(${argsToString(args)}) == ${JSON.stringify(result)}`, () => {
      expect(assignPrefixesOptions(...args)).toEqual(result);
    });
  }

  test('returns a config, never the raw string shorthand', () => {
    // mergeWithDefault handed the primitive straight back before the fix.
    expect(typeof assignPrefixesOptions('myapp')).toBe('object');
    expect(assignPrefixesOptions('myapp')).not.toEqual('myapp');
  });

  test('does not mutate or alias its arguments', () => {
    const prefixes: Partial<PrefixesConfig> = { cssVariable: 'vars' };
    const result = assignPrefixesOptions(prefixes);
    expect(prefixes).toEqual({ cssVariable: 'vars' });
    expect(result).not.toBe(prefixes);
  });
});

describe('assignDocumentOptions', () => {
  test('fills every key with a default', () => {
    expect(assignDocumentOptions()).toEqual({
      size: { width: '8.5in', height: '11in' },
      variants: {},
      prefixes: DEFAULT_PREFIXES,
    });
  });

  test('accepts undefined arguments', () => {
    expect(assignDocumentOptions(undefined, undefined)).toEqual(
      assignDocumentOptions(),
    );
  });

  test('overrides the page size', () => {
    expect(
      assignDocumentOptions({ size: { width: '210cm', height: '297cm' } }).size,
    ).toEqual({ width: '210cm', height: '297cm' });
  });

  test('resolves a prefixes string shorthand into a config', () => {
    expect(assignDocumentOptions({}, { prefixes: 'myapp' }).prefixes).toEqual({
      elementClassName: 'myapp-element',
      variantClassName: 'myapp-variant',
      cssVariable: 'myapp',
    });
  });

  test('resolves partial prefixes without dropping the other keys', () => {
    expect(
      assignDocumentOptions({ prefixes: { cssVariable: 'vars' } }).prefixes,
    ).toEqual({ ...DEFAULT_PREFIXES, cssVariable: 'vars' });
  });

  test('merges variants, later arguments winning', () => {
    expect(
      assignDocumentOptions(
        {},
        { variants: { a: { fontWeight: 'bold' }, b: { color: 'red' } } },
        { variants: { b: { color: 'blue' } } },
      ).variants,
    ).toEqual({
      a: { fontWeight: 'bold' },
      b: { color: 'blue' },
    });
  });

  test('later arguments win for the page size', () => {
    expect(
      assignDocumentOptions(
        {},
        { size: { width: '5in', height: '7in' } },
        { size: { width: '6in', height: '9in' } },
      ).size,
    ).toEqual({ width: '6in', height: '9in' });
  });

  test('does not alias the size object it was given', () => {
    const size = { width: '5in', height: '7in' } as const;
    const config = assignDocumentOptions({}, { size });
    expect(config.size).not.toBe(size);
    expect(size).toEqual({ width: '5in', height: '7in' });
  });
});

describe('assignStackOptions', () => {
  const DEFAULT_STACK = {
    margin: DEFAULT_MARGIN,
    continuous: false,
    columns: { columnCount: 1, columnGap: '0.5in' },
  };

  test('fills every key with a default', () => {
    expect(assignStackOptions()).toEqual(DEFAULT_STACK);
  });

  test('accepts undefined arguments', () => {
    expect(assignStackOptions(undefined, undefined)).toEqual(DEFAULT_STACK);
  });

  test('deep merges a partial margin', () => {
    expect(assignStackOptions({ margin: { top: '1in' } }).margin).toEqual({
      ...DEFAULT_MARGIN,
      top: '1in',
    });
  });

  test('later arguments win', () => {
    expect(
      assignStackOptions(
        { continuous: true, margin: { top: '1in' } },
        { margin: { top: '2in' } },
      ),
    ).toEqual({
      ...DEFAULT_STACK,
      continuous: true,
      margin: { ...DEFAULT_MARGIN, top: '2in' },
    });
  });

  test('does not mutate or alias the options it was given', () => {
    const options: StackOptions = { margin: { top: '1in' } };
    const config = assignStackOptions(options);
    expect(options).toEqual({ margin: { top: '1in' } });
    expect(config).not.toBe(options);
    expect(config.margin).not.toBe(options.margin);
  });
});

describe('mapLayoutKeys', () => {
  test('visits every layout type and element type', () => {
    expect(
      mapLayoutKeys(
        (layoutType, elementType) => `${layoutType}-${elementType}`,
      ),
    ).toEqual({
      first: { header: 'first-header', footer: 'first-footer' },
      subsequent: {
        header: 'subsequent-header',
        footer: 'subsequent-footer',
      },
    });
  });

  test('rejects reusing the same element object in two slots', () => {
    const element = { shared: true };
    expect(() => mapLayoutKeys(() => element)).toThrow(TypeError);
  });
});

describe('createDefaultLayoutConfig', () => {
  test('declares every layout slot as undefined', () => {
    const config = createDefaultLayoutConfig<string>();
    expect(Object.keys(config)).toEqual(['first', 'subsequent']);
    expect(Object.keys(config.first)).toEqual(['header', 'footer']);
    expect(Object.keys(config.subsequent)).toEqual(['header', 'footer']);
    expect(config).toEqual({
      first: { header: undefined, footer: undefined },
      subsequent: { header: undefined, footer: undefined },
    });
  });
});

describe('assignLayoutOptions', () => {
  const assignInto = (
    ...args: ReadonlyArray<undefined | Partial<LayoutOptions<string>>>
  ) =>
    assignLayoutOptions<string>(createDefaultLayoutConfig<string>(), ...args);

  test('fills the slots it is given and leaves the rest undefined', () => {
    expect(assignInto({ first: { header: 'H' } })).toEqual({
      first: { header: 'H', footer: undefined },
      subsequent: { header: undefined, footer: undefined },
    });
  });

  test('accepts undefined arguments', () => {
    expect(assignInto(undefined)).toEqual(createDefaultLayoutConfig());
  });

  test('later arguments win per slot', () => {
    expect(
      assignInto(
        { first: { header: 'A', footer: 'B' } },
        { first: { header: 'C' }, subsequent: { footer: 'D' } },
      ),
    ).toEqual({
      first: { header: 'C', footer: 'B' },
      subsequent: { header: undefined, footer: 'D' },
    });
  });

  test('mutates the target so callers can accumulate layouts', () => {
    // mapHtmlToDocument relies on this: it discards the return value and reads
    // the accumulated `layoutElements` after every header/footer element.
    const target = createDefaultLayoutConfig<string>();
    assignLayoutOptions<string>(target, { first: { header: 'H' } });
    expect(target.first.header).toEqual('H');
  });

  test('leaves a target it is given twice untouched beyond the assignment', () => {
    const target = createDefaultLayoutConfig<string>();
    const result = assignLayoutOptions<string>(target, {
      subsequent: { footer: 'F' },
    });
    expect(result).toBe(target);
    expect(target).toEqual({
      first: { header: undefined, footer: undefined },
      subsequent: { header: undefined, footer: 'F' },
    });
  });

  /**
   * A single argument used to be handed straight back: with nothing to assign
   * onto it the reduce never ran, so the caller received the partial it passed
   * in rather than a `LayoutConfig`.
   */
  describe('with a single argument', () => {
    test('fills the slots the argument does not declare', () => {
      expect(assignLayoutOptions<string>({ first: { header: 'H' } })).toEqual({
        first: { header: 'H', footer: undefined },
        subsequent: { header: undefined, footer: undefined },
      });
    });

    test('declares every layout slot', () => {
      // The target is normalised in place, so its own keys keep the order they
      // were written in; only their presence is part of the contract.
      const config = assignLayoutOptions<string>({ subsequent: {} });
      expect(Object.keys(config).sort()).toEqual(['first', 'subsequent']);
      expect(Object.keys(config.first)).toEqual(['header', 'footer']);
      expect(Object.keys(config.subsequent)).toEqual(['header', 'footer']);
    });

    test('normalises the target in place, as the two argument form does', () => {
      const target: Partial<LayoutOptions<string>> = { first: { header: 'H' } };
      expect(assignLayoutOptions<string>(target)).toBe(target);
      expect(target).toEqual({
        first: { header: 'H', footer: undefined },
        subsequent: { header: undefined, footer: undefined },
      });
    });

    test('matches the default config with no argument at all', () => {
      expect(assignLayoutOptions<string>()).toEqual(
        createDefaultLayoutConfig<string>(),
      );
      expect(assignLayoutOptions<string>(undefined)).toEqual(
        createDefaultLayoutConfig<string>(),
      );
    });

    test('is the identity for a config that is already complete', () => {
      const config = assignLayoutOptions<string>(
        createDefaultLayoutConfig<string>(),
        { first: { header: 'H' }, subsequent: { footer: 'F' } },
      );
      expect(assignLayoutOptions<string>({ ...config })).toEqual(config);
    });
  });
});
