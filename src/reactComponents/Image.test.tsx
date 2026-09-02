import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import { decodeElementData } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { MOCK_IMAGE_DATA_URL } from '../fixtures/mockImage';
import { ContentProvider } from './ContentProvider';
import { Image, type ImageProps } from './Image';

const render = (element: ReactElement, documentType: 'web' | 'docx' = 'web') =>
  reactToHtml(() => <ContentProvider>{element}</ContentProvider>, documentType);

/**
 * The `data-matti-docs-*` attributes as the back half of the pipeline reads
 * them, i.e. through the same decoder `mapHtmlToDocument` uses.
 */
const decodeAttributes = (html: string) => {
  const properties: Record<string, string> = {};
  for (const [, name, value] of html.matchAll(
    /(data-matti-docs-[a-z-]+)="([^"]*)"/g,
  )) {
    properties[name] = value;
  }
  return decodeElementData({ properties });
};

const renderImage = (props: ImageProps, documentType?: 'web' | 'docx') =>
  render(<Image {...props} />, documentType);

describe('Image', () => {
  test('renders an img with its source and alt text', () => {
    const html = renderImage({
      src: '/photo.png',
      alt: 'A photograph',
      width: '2in',
    });

    expect(html).toContain('<img');
    expect(html).toContain('src="/photo.png"');
    expect(html).toContain('alt="A photograph"');
  });

  test('sizes the image with CSS and leaves the missing axis automatic', () => {
    expect(
      renderImage({ src: '/photo.png', alt: 'Photo', width: '2in' }),
    ).toContain('width:2in;height:auto');

    expect(
      renderImage({ src: '/photo.png', alt: 'Photo', height: '3cm' }),
    ).toContain('width:auto;height:3cm');

    expect(
      renderImage({
        src: '/photo.png',
        alt: 'Photo',
        width: '2in',
        height: '3cm',
      }),
    ).toContain('width:2in;height:3cm');
  });

  test('aligns a block image with automatic margins', () => {
    expect(
      renderImage({
        src: '/photo.png',
        alt: 'Photo',
        width: '2in',
        align: 'center',
      }),
    ).toContain('display:block;margin-left:auto;margin-right:auto');

    expect(
      renderImage({
        src: '/photo.png',
        alt: 'Photo',
        width: '2in',
        align: 'right',
      }),
    ).toContain('display:block;margin-left:auto;margin-right:0');
  });

  test('leaves the image inline when no alignment is asked for', () => {
    const html = renderImage({ src: '/photo.png', alt: 'Photo', width: '2in' });

    expect(html).not.toContain('display:block');
    expect(html).not.toContain('margin-left');
  });

  test('encodes the element data every non-web target reads', () => {
    const html = renderImage(
      {
        src: MOCK_IMAGE_DATA_URL,
        alt: 'Swatch',
        width: '1in',
        align: 'center',
      },
      'docx',
    );

    expect(decodeAttributes(html)).toEqual({
      elementType: 'image',
      elementOptions: {
        src: MOCK_IMAGE_DATA_URL,
        width: '1in',
        alt: 'Swatch',
        align: 'center',
      },
      contentOptions: {},
      variant: undefined,
    });
  });

  test('encodes no element data for the web target', () => {
    const html = renderImage({ src: '/photo.png', alt: 'Photo', width: '2in' });

    expect(html).not.toContain('data-matti-docs');
  });

  test('rejects an image with neither a width nor a height', () => {
    // The prop types make this unreachable in TypeScript, but a JavaScript
    // caller reaches Word with a picture Word has no size for.
    expect(() =>
      renderImage({ src: '/photo.png', alt: 'Photo' } as unknown as ImageProps),
    ).toThrow('/photo.png');
  });
});
