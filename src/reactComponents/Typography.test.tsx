import { describe, expect, test } from 'vitest';
import {
  type ElementData,
  type TagName,
  type TypographyOptions,
  TYPOGRAPHY_CSS_KEYS,
  decodeElementData,
} from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { mapHtml } from '../utils/mapHtml/mapHtml';
import { ContentProvider } from './ContentProvider';
import { Typography, type TypographyProps } from './Typography';

const renderTypography = (
  props: TypographyProps,
  documentType: 'web' | 'pdf' = 'web',
) =>
  reactToHtml(
    () => (
      <ContentProvider>
        <Typography {...props} />
      </ContentProvider>
    ),
    documentType,
  );

/** Reads back the element data every non-web target encodes onto the tag. */
const decodeOnlyElement = (html: string): ElementData => {
  const elements: Array<ElementData> = [];
  mapHtml<Record<string, never>, unknown>(html, {
    onElementBeforeChildren: ({ htmlElement }) => {
      elements.push(decodeElementData(htmlElement));
      return {};
    },
    onText: () => [],
    onElementAfterChildren: () => [],
  });
  expect(elements, 'encoded elements').toHaveLength(1);
  return elements[0];
};

const styleOf = (html: string) => /style="([^"]*)"/.exec(html)?.[1];

const classOf = (html: string) => /class="([^"]*)"/.exec(html)?.[1];

// `br` is a void element and is asserted separately.
const TAG_NAMES = [
  'div',
  'p',
  'blockquote',
  'pre',
  'code',
  'label',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'b',
  'strong',
  'i',
  'em',
  's',
  'u',
  'sub',
  'sup',
  'span',
  'svg',
] as const satisfies ReadonlyArray<TagName>;

/** One CSS-shaped typography option per key, and the var it must produce. */
const CSS_VAR_SUBJECTS: ReadonlyArray<[TypographyOptions, string]> = [
  [{ breakInside: 'avoid' }, '--matti-docs-break-inside:avoid'],
  [{ breakAfter: 'avoid' }, '--matti-docs-break-after:avoid'],
  [{ textAlign: 'center' }, '--matti-docs-text-align:center'],
  [{ lineHeight: '1.5' }, '--matti-docs-line-height:1.5'],
  [{ fontWeight: 'bold' }, '--matti-docs-font-weight:bold'],
  [{ fontStyle: 'italic' }, '--matti-docs-font-style:italic'],
  [{ fontSize: '12pt' }, '--matti-docs-font-size:12pt'],
  [{ fontFamily: 'Arial' }, '--matti-docs-font-family:Arial'],
  [{ color: 'red' }, '--matti-docs-color:red'],
  [{ textTransform: 'uppercase' }, '--matti-docs-text-transform:uppercase'],
  [{ textDecoration: 'underline' }, '--matti-docs-text-decoration:underline'],
  [{ textIndent: '1in' }, '--matti-docs-text-indent:1in'],
  [{ marginTop: '1pt' }, '--matti-docs-margin-top:1pt'],
  [{ marginRight: '2pt' }, '--matti-docs-margin-right:2pt'],
  [{ marginBottom: '3pt' }, '--matti-docs-margin-bottom:3pt'],
  [{ paddingBottom: '4pt' }, '--matti-docs-padding-bottom:4pt'],
  [{ borderBottomWidth: '1px' }, '--matti-docs-border-bottom-width:1px'],
  [{ borderBottomColor: 'blue' }, '--matti-docs-border-bottom-color:blue'],
  [{ marginLeft: '5pt' }, '--matti-docs-margin-left:5pt'],
  [{ whiteSpace: 'nowrap' }, '--matti-docs-white-space:nowrap'],
];

/**
 * Every library element carries the class of its element type so a consumer's
 * stylesheet can reach it without depending on the tag Typography rendered.
 */
const ELEMENT_CLASS_NAME = 'matti-docs-element-htmltag';

/** Typography options with no CSS equivalent; only the DOCX target reads them. */
const CUSTOM_OPTIONS: TypographyOptions = {
  highlightColor: '#ffff00',
  superScript: true,
  subScript: true,
};

describe('Typography', () => {
  test('renders a span by default', () => {
    expect(renderTypography({ children: 'text' })).toEqual(
      `<span class="${ELEMENT_CLASS_NAME}">text</span>`,
    );
  });

  for (const as of TAG_NAMES) {
    test(`renders the ${as} requested by the as prop`, () => {
      expect(renderTypography({ as, children: 'text' })).toEqual(
        `<${as} class="${ELEMENT_CLASS_NAME}">text</${as}>`,
      );
    });
  }

  test('renders a void br with no children', () => {
    expect(renderTypography({ as: 'br' })).toEqual(
      `<br class="${ELEMENT_CLASS_NAME}"/>`,
    );
  });

  describe('css variables', () => {
    for (const [options, declaration] of CSS_VAR_SUBJECTS) {
      test(`${Object.keys(options)[0]} becomes ${declaration}`, () => {
        expect(
          styleOf(renderTypography({ ...options, children: 'text' })),
        ).toEqual(declaration);
      });
    }

    test('covers every CSS-shaped typography key', () => {
      expect(
        CSS_VAR_SUBJECTS.flatMap(([options]) => Object.keys(options)).sort(),
      ).toEqual([...TYPOGRAPHY_CSS_KEYS].sort());
    });

    test('emits one declaration per option', () => {
      expect(
        styleOf(
          renderTypography({
            fontWeight: 'bold',
            color: 'red',
            children: 'text',
          }),
        ),
      ).toEqual('--matti-docs-font-weight:bold;--matti-docs-color:red');
    });

    test('turns an array of options into a var fallback chain', () => {
      expect(
        styleOf(
          renderTypography({
            fontFamily: ['--custom-family', 'serif'],
            children: 'text',
          }),
        ),
      ).toEqual('--matti-docs-font-family:var(--custom-family, serif)');
    });

    test('does not emit options CSS cannot express', () => {
      expect(renderTypography({ ...CUSTOM_OPTIONS, children: 'text' })).toEqual(
        `<span class="${ELEMENT_CLASS_NAME}">text</span>`,
      );
    });

    /**
     * `pre`, `code` and `blockquote` get their meaning from the stylesheet
     * `lib/styles.ts` builds and from the DOCX mapper, never from an inline
     * variable, so a variant an author applies still wins over them.
     */
    test('does not inline the styles the block tags already carry', () => {
      for (const as of ['blockquote', 'pre', 'code'] as const) {
        expect(
          styleOf(renderTypography({ as, children: 'text' })),
          as,
        ).toBeUndefined();
      }
    });

    test('renders the source of a pre verbatim', () => {
      // `white-space: pre` only means anything if the newlines and the runs of
      // spaces reach the markup, so nothing may normalise them on the way out.
      expect(
        renderTypography({
          as: 'pre',
          children: 'const a = 1;\n  const b = 2;',
        }),
      ).toEqual(
        `<pre class="${ELEMENT_CLASS_NAME}">const a = 1;\n  const b = 2;</pre>`,
      );
    });

    test('encodes preformatted whitespace as an option like any other', () => {
      expect(
        styleOf(renderTypography({ whiteSpace: 'pre', children: 'text' })),
      ).toEqual('--matti-docs-white-space:pre');
      expect(
        decodeOnlyElement(
          renderTypography({ whiteSpace: 'pre', children: 'text' }, 'pdf'),
        ).contentOptions,
      ).toEqual({ whiteSpace: 'pre' });
    });

    test('does not inline the styles intrinsic tags already carry', () => {
      // b/strong/i/em/u/s/sub/sup get their meaning from the injected stylesheet
      // in the browser and from INTRINSIC_TYPOGRAPHY_OPTIONS in the DOCX
      // mapper, never from an inline variable on the tag itself.
      for (const as of [
        'b',
        'strong',
        'i',
        'em',
        'u',
        's',
        'sub',
        'sup',
      ] as const) {
        expect(
          styleOf(renderTypography({ as, children: 'text' })),
        ).toBeUndefined();
      }
    });

    test('lets the style prop sit alongside the option variables', () => {
      expect(
        styleOf(
          renderTypography({
            color: 'blue',
            style: { color: 'red' },
            children: 'text',
          }),
        ),
      ).toEqual('--matti-docs-color:blue;color:red');
    });
  });

  describe('class names', () => {
    test('prefixes the variant name', () => {
      expect(
        classOf(renderTypography({ variant: 'heading1', children: 'text' })),
      ).toEqual(`${ELEMENT_CLASS_NAME} matti-docs-variant-heading-1`);
    });

    test('keeps the className prop in front of the library classes', () => {
      expect(
        classOf(
          renderTypography({
            className: 'mine',
            variant: 'heading1',
            children: 'text',
          }),
        ),
      ).toEqual(`mine ${ELEMENT_CLASS_NAME} matti-docs-variant-heading-1`);
    });

    test('renders the className prop alongside the element class', () => {
      expect(
        classOf(renderTypography({ className: 'mine', children: 't' })),
      ).toEqual(`mine ${ELEMENT_CLASS_NAME}`);
    });

    test('always renders the element type class', () => {
      expect(classOf(renderTypography({ children: 't' }))).toEqual(
        ELEMENT_CLASS_NAME,
      );
    });

    test('honours the prefixes of the surrounding content provider', () => {
      const html = reactToHtml(
        () => (
          <ContentProvider
            prefixes={{
              elementClassName: 'app-element',
              variantClassName: 'app-variant',
              cssVariable: 'app',
            }}
          >
            <Typography variant="heading1" fontWeight="bold">
              text
            </Typography>
          </ContentProvider>
        ),
        'web',
      );
      expect(classOf(html)).toEqual(
        'app-element-htmltag app-variant-heading-1',
      );
      expect(styleOf(html)).toEqual('--app-font-weight:bold');
    });
  });

  describe('non-web targets', () => {
    test('encodes the element data instead of CSS variables', () => {
      const html = renderTypography(
        {
          as: 'p',
          variant: 'heading1',
          fontWeight: 'bold',
          children: 'text',
        },
        'pdf',
      );

      expect(styleOf(html)).toBeUndefined();
      expect(decodeOnlyElement(html)).toEqual({
        elementType: 'htmltag',
        elementOptions: {},
        contentOptions: { fontWeight: 'bold' },
        variant: 'heading1',
      });
    });

    test('still renders the element and variant class names', () => {
      expect(
        classOf(
          renderTypography({ variant: 'heading1', children: 'text' }, 'pdf'),
        ),
      ).toEqual(`${ELEMENT_CLASS_NAME} matti-docs-variant-heading-1`);
    });

    test('encodes the options CSS cannot express', () => {
      expect(
        decodeOnlyElement(
          renderTypography({ ...CUSTOM_OPTIONS, children: 'text' }, 'pdf'),
        ).contentOptions,
      ).toEqual(CUSTOM_OPTIONS);
    });

    test('encodes empty content options when no typography is given', () => {
      expect(
        decodeOnlyElement(renderTypography({ as: 'p', children: 't' }, 'pdf')),
      ).toEqual({
        elementType: 'htmltag',
        elementOptions: {},
        contentOptions: {},
        variant: undefined,
      });
    });

    test('leaves the style prop as a real inline style', () => {
      expect(
        styleOf(
          renderTypography(
            { style: { color: 'red' }, color: 'blue', children: 't' },
            'pdf',
          ),
        ),
      ).toEqual('color:red');
    });
  });
});
