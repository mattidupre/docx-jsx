import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentProvider, Typography } from '../reactComponents';
import { InternalEnvironmentProvider } from '../reactComponents/InternalEnvironmentProvider';
import {
  decodeElementData,
  encodeElementData,
  type ElementData,
} from './elements';

/**
 * The DOCX mapper takes all of its meaning from tag names and these four
 * attributes, so their names and payload encoding are a wire format: markup
 * serialized by one version of the library has to decode in another. The
 * expected strings are literal on purpose -- they must not be derived from the
 * code under test.
 */
describe('the data attribute wire format', () => {
  const SUBJECTS: ReadonlyArray<ElementData> = [
    {
      elementType: 'htmltag',
      elementOptions: {},
      contentOptions: {
        fontSize: '2rem',
        color: ['--brand', '#00dddd'],
        fontFamily: 'Pacifico, "Comic Sans"',
      },
      variant: 'heading1',
    },
    {
      elementType: 'document',
      elementOptions: {
        size: { width: '8.5in', height: '11in' },
        variants: { body: { fontSize: '1rem' } },
        prefixes: {
          elementClassName: 'matti-docs-element',
          variantClassName: 'matti-docs-variant',
          cssVariable: 'matti-docs',
        },
      },
      contentOptions: {},
      variant: undefined,
    },
    {
      elementType: 'tableCell',
      elementOptions: { header: true, colSpan: 2 },
      contentOptions: { textAlign: 'center' },
      variant: undefined,
    },
  ];

  test('encodes names and payloads byte for byte', () => {
    expect(SUBJECTS.map(encodeElementData)).toMatchInlineSnapshot(`
      [
        {
          "data-matti-docs-content-options": "%7B%22fontSize%22:%222rem%22,%22color%22:%5B%22--brand%22,%22#00dddd%22%5D,%22fontFamily%22:%22Pacifico,%20%5C%22Comic%20Sans%5C%22%22%7D",
          "data-matti-docs-element-options": "%7B%7D",
          "data-matti-docs-element-type": "htmltag",
          "data-matti-docs-variant": "heading1",
        },
        {
          "data-matti-docs-content-options": "%7B%7D",
          "data-matti-docs-element-options": "%7B%22size%22:%7B%22width%22:%228.5in%22,%22height%22:%2211in%22%7D,%22variants%22:%7B%22body%22:%7B%22fontSize%22:%221rem%22%7D%7D,%22prefixes%22:%7B%22elementClassName%22:%22matti-docs-element%22,%22variantClassName%22:%22matti-docs-variant%22,%22cssVariable%22:%22matti-docs%22%7D%7D",
          "data-matti-docs-element-type": "document",
        },
        {
          "data-matti-docs-content-options": "%7B%22textAlign%22:%22center%22%7D",
          "data-matti-docs-element-options": "%7B%22header%22:true,%22colSpan%22:2%7D",
          "data-matti-docs-element-type": "tableCell",
        },
      ]
    `);
  });

  test('leaves out a falsy payload, as the wire format always has', () => {
    expect(
      Object.keys(
        encodeElementData({
          elementType: 'htmltag',
          elementOptions: {},
          contentOptions: {},
          variant: '',
        }),
      ),
    ).toEqual([
      'data-matti-docs-element-type',
      'data-matti-docs-element-options',
      'data-matti-docs-content-options',
    ]);
  });

  test('decodes what it encodes', () => {
    for (const subject of SUBJECTS) {
      // HAST hands attributes over camel cased.
      const properties = Object.fromEntries(
        Object.entries(encodeElementData(subject)).map(([key, value]) => [
          key.replace(/-([a-z])/g, (_match, letter: string) =>
            letter.toUpperCase(),
          ),
          value,
        ]),
      );
      expect(decodeElementData({ properties })).toEqual(subject);
    }
  });

  test('renders the class names and custom properties the stylesheets select', () => {
    const markup = (documentType: 'web' | 'pdf') =>
      renderToStaticMarkup(
        <InternalEnvironmentProvider documentType={documentType}>
          <DocumentProvider prefixes={{ cssVariable: 'resume' }}>
            <Typography as="p" variant="heading1" fontSize="2rem">
              Text
            </Typography>
          </DocumentProvider>
        </InternalEnvironmentProvider>,
      );
    expect(markup('web')).toMatchInlineSnapshot(
      `"<p class="matti-docs-element-htmltag matti-docs-variant-heading-1" style="--resume-font-size:32px">Text</p>"`,
    );
    expect(markup('pdf')).toMatchInlineSnapshot(
      `"<div class="matti-docs-element-document" data-matti-docs-element-type="document" data-matti-docs-element-options="%7B%22size%22:%7B%22width%22:%228.5in%22,%22height%22:%2211in%22%7D,%22variants%22:%7B%7D,%22prefixes%22:%7B%22elementClassName%22:%22matti-docs-element%22,%22variantClassName%22:%22matti-docs-variant%22,%22cssVariable%22:%22resume%22%7D%7D"><p class="matti-docs-element-htmltag matti-docs-variant-heading-1" data-matti-docs-element-type="htmltag" data-matti-docs-element-options="%7B%7D" data-matti-docs-content-options="%7B%22fontSize%22:%222rem%22%7D" data-matti-docs-variant="heading1">Text</p></div>"`,
    );
  });
});
