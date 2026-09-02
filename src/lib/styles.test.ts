import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import type { Browser } from 'puppeteer-core';
import {
  createMockPrefixesConfig,
  createMockVariantsConfig,
} from '../fixtures';
import { mockFonts } from '../fixtures/mockFonts';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../fixtures/browserHarness';
import type * as entitiesModule from '../entities';
import {
  createFontFaceString,
  createStyleArray,
  createStyleString,
} from './styles';
import type * as stylesModule from './styles';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type StylesApi = typeof stylesModule & typeof entitiesModule;

const createOptions = () => ({
  variants: createMockVariantsConfig(),
  prefixes: createMockPrefixesConfig(),
});

test('createStyleArray', () => {
  const cssRules = createStyleArray(createOptions());
  expect(cssRules).toMatchSnapshot();
});

test('createStyleString', () => {
  const cssString = createStyleString(createOptions());
  expect(cssString).toMatchSnapshot();
});

describe('createFontFaceString', () => {
  it('emits nothing when no fonts are configured', () => {
    expect(createFontFaceString({ documentType: 'pdf' })).toBe('');
  });

  it('emits nothing for docx, which names installed fonts instead', () => {
    expect(
      createFontFaceString({ fonts: mockFonts, documentType: 'docx' }),
    ).toBe('');
  });

  it('emits one rule per configured face', () => {
    const css = createFontFaceString({
      fonts: mockFonts,
      documentType: 'web',
    });

    expect(css.match(/@font-face/g)).toHaveLength(
      mockFonts.Merriweather.fontFaces.length,
    );
    expect(css).toContain('font-family: "Merriweather";');
    expect(css).toContain(
      'src: url("Merriweather-Regular.ttf") format("truetype");',
    );
    expect(css).toContain('font-weight: 400;');
    expect(css).toContain('font-style: italic;');
  });

  it('reuses a web source for pdf', () => {
    expect(
      createFontFaceString({ fonts: mockFonts, documentType: 'pdf' }),
    ).toBe(createFontFaceString({ fonts: mockFonts, documentType: 'web' }));
  });

  it('writes the descriptors of a face verbatim', () => {
    const fonts: entitiesModule.FontsConfig = {
      'Test Font': {
        fontFaces: [
          {
            fontWeight: 'bold',
            fontStyle: 'normal',
            sources: [{ src: 'test.woff2', format: 'woff2' }],
          },
        ],
      },
    };

    expect(createFontFaceString({ fonts, documentType: 'pdf' })).toBe(
      [
        '@font-face {',
        '  font-family: "Test Font";',
        '  src: url("test.woff2") format("woff2");',
        '  font-weight: bold;',
        '  font-style: normal;',
        '}',
      ].join('\n'),
    );
  });
});

describe('createStyleString in a browser', () => {
  let browser: Browser;
  let harness: BrowserHarness<StylesApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<StylesApi>(browser, {
      modules: ['./styles', '../entities'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  it('applies borders and padding only to the element that declares them', async () => {
    const computed = await harness.evaluate(async (api) => {
      const styleSheet = new CSSStyleSheet();
      await styleSheet.replace(
        api.createStyleString({
          prefixes: api.assignPrefixesOptions(),
          variants: {
            underlined: {
              paddingBottom: '8px',
              borderBottomWidth: '4px',
              borderBottomColor: 'rgb(255, 0, 0)',
            },
          },
        }),
      );
      document.adoptedStyleSheets.push(styleSheet);

      document.body.innerHTML =
        '<p id="declaring" class="matti-docs-variant-underlined">' +
        'text <span id="nested">nested</span>' +
        '</p>';

      const readStyle = (id: string) => {
        const style = window.getComputedStyle(document.getElementById(id)!);
        return {
          borderBottomWidth: style.borderBottomWidth,
          borderBottomColor: style.borderBottomColor,
          paddingBottom: style.paddingBottom,
        };
      };

      return { declaring: readStyle('declaring'), nested: readStyle('nested') };
    });

    expect(computed.declaring).toEqual({
      borderBottomWidth: '4px',
      borderBottomColor: 'rgb(255, 0, 0)',
      paddingBottom: '8px',
    });

    // The variant's variables are inherited by the span, but the `*` rule
    // resets them so the underline is not drawn a second time around it.
    expect(computed.nested).toEqual({
      borderBottomWidth: '0px',
      borderBottomColor: 'rgb(0, 0, 0)',
      paddingBottom: '0px',
    });
  });

  /**
   * The browser half of the shared heading scale. The same table produces the
   * `Heading1`..`Heading6` styles of a DOCX (see
   * `parsers/docx/headingScale.test.tsx`), so these are the numbers both
   * targets have to agree on.
   */
  it('resolves every heading to the shared scale', async () => {
    const computed = await harness.evaluate(async (api) => {
      const styleSheet = new CSSStyleSheet();
      await styleSheet.replace(
        api.createStyleString({
          prefixes: api.assignPrefixesOptions(),
          variants: { bigHeading: { fontSize: '40px' } },
        }),
      );
      document.adoptedStyleSheets = [styleSheet];

      document.body.innerHTML = [
        '<h1 id="h1">One</h1>',
        '<h2 id="h2">Two</h2>',
        '<h3 id="h3">Three</h3>',
        '<h4 id="h4">Four</h4>',
        '<h5 id="h5">Five</h5>',
        '<h6 id="h6">Six</h6>',
        '<p id="p">Body</p>',
        '<h2 id="variant" class="matti-docs-variant-big-heading">Variant</h2>',
      ].join('');

      const readStyle = (id: string) => {
        const style = window.getComputedStyle(document.getElementById(id)!);
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
        };
      };

      return Object.fromEntries(
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'variant'].map((id) => [
          id,
          readStyle(id),
        ]),
      );
    });

    expect(computed).toMatchObject({
      h1: { fontSize: '32px', marginTop: '21.44px', marginBottom: '21.44px' },
      h2: { fontSize: '24px', marginTop: '19.92px', marginBottom: '19.92px' },
      h3: {
        fontSize: '18.72px',
        marginTop: '18.72px',
        marginBottom: '18.72px',
      },
      h4: { fontSize: '16px', marginTop: '21.28px', marginBottom: '21.28px' },
      h5: {
        fontSize: '13.28px',
        marginTop: '22.18px',
        marginBottom: '22.18px',
      },
      h6: {
        fontSize: '10.72px',
        marginTop: '24.98px',
        marginBottom: '24.98px',
      },
    });

    for (const id of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(computed[id].fontWeight, id).toBe('700');
    }

    // A paragraph keeps the library's own defaults: body size, no margins.
    expect(computed.p).toEqual({
      fontSize: '16px',
      fontWeight: '400',
      marginTop: '0px',
      marginBottom: '0px',
    });

    // A variant is declared after the intrinsic rules and both selectors are
    // `:where()`, so the variant wins on the property it redeclares and the
    // tag still supplies the rest.
    expect(computed.variant).toMatchObject({
      fontSize: '40px',
      marginTop: '19.92px',
      marginBottom: '19.92px',
    });
  });

  /**
   * The browser half of the intrinsic block tags. The same table produces the
   * paragraph and run properties of a DOCX (see `parsers/docx/blockTags.test.tsx`
   * and `parsers/docx/typographyOptionsToDocx.test.ts`), so these are the
   * numbers both targets have to agree on.
   *
   * They cannot be left to the user agent stylesheet: the library's own `*`
   * rule resets `font-family` and `white-space` to `unset` on every element,
   * which would leave a `pre` set in the body font with its whitespace
   * collapsed.
   */
  it('resolves blockquote, pre and code to the shared intrinsic typography', async () => {
    const computed = await harness.evaluate(async (api) => {
      const styleSheet = new CSSStyleSheet();
      await styleSheet.replace(
        api.createStyleString({
          prefixes: api.assignPrefixesOptions(),
          variants: { tightQuote: { marginLeft: '0px' } },
        }),
      );
      document.adoptedStyleSheets = [styleSheet];

      document.body.innerHTML = [
        '<blockquote id="blockquote"><p id="quoted">Quote</p></blockquote>',
        '<pre id="pre">const a = 1;</pre>',
        '<p id="paragraph">Run <code id="code">npm</code> first.</p>',
        '<blockquote id="variant" class="matti-docs-variant-tight-quote">',
        '<p>Quote</p></blockquote>',
      ].join('');

      const readStyle = (id: string) => {
        const style = window.getComputedStyle(document.getElementById(id)!);
        return {
          fontFamily: style.fontFamily,
          whiteSpace: style.whiteSpace,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
        };
      };

      return Object.fromEntries(
        ['blockquote', 'quoted', 'pre', 'paragraph', 'code', 'variant'].map(
          (id) => [id, readStyle(id)],
        ),
      );
    });

    // 16px of margin block, 40px of margin inline, and no whitespace or font
    // of its own: a quote holds paragraphs, it does not restyle their text.
    expect(computed.blockquote).toMatchObject({
      marginTop: '16px',
      marginBottom: '16px',
      marginLeft: '40px',
      marginRight: '40px',
    });
    // The library resets a paragraph's margins, and a quoted one is no
    // different: the inset belongs to the quote.
    expect(computed.quoted).toMatchObject({
      marginTop: '0px',
      marginBottom: '0px',
      marginLeft: '0px',
    });

    expect(computed.pre).toMatchObject({
      whiteSpace: 'pre',
      marginTop: '16px',
      marginBottom: '16px',
      marginLeft: '0px',
    });
    expect(computed.pre.fontFamily).toBe('monospace');
    expect(computed.code.fontFamily).toBe('monospace');

    // The tags around them are untouched: `code` is inline and carries no
    // margins, and a paragraph keeps the body font.
    expect(computed.paragraph.fontFamily).not.toBe('monospace');
    expect(computed.paragraph.whiteSpace).toBe('normal');
    expect(computed.code).toMatchObject({
      marginTop: '0px',
      marginLeft: '0px',
    });

    // A variant is declared after the intrinsic rules and both selectors are
    // `:where()`, so the variant wins on the property it redeclares and the
    // tag still supplies the rest.
    expect(computed.variant).toMatchObject({
      marginLeft: '0px',
      marginRight: '40px',
      marginTop: '16px',
    });
  });

  /**
   * The DOCX target applies Word's `Hyperlink` character style only inside an
   * `<a href>`, so the stylesheet has to draw the same line: an `<a>` with no
   * `href` is a `Bookmark`, an anchor target rather than a link.
   */
  it('applies the hyperlink variant to links but not to anchor targets', async () => {
    const computed = await harness.evaluate(async (api) => {
      const styleSheet = new CSSStyleSheet();
      await styleSheet.replace(
        api.createStyleString({
          prefixes: api.assignPrefixesOptions(),
          variants: { hyperlink: { color: 'rgb(255, 0, 255)' } },
        }),
      );
      document.adoptedStyleSheets = [styleSheet];

      document.body.innerHTML =
        '<p><a id="link" href="https://example.com/">Link</a>' +
        '<a id="bookmark">Anchor</a></p>';

      const readColor = (id: string) =>
        window.getComputedStyle(document.getElementById(id)!).color;

      return { link: readColor('link'), bookmark: readColor('bookmark') };
    });

    expect(computed.link).toBe('rgb(255, 0, 255)');
    expect(computed.bookmark).not.toBe('rgb(255, 0, 255)');
  });
});
