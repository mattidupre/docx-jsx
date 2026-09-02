import type { SVGProps } from 'react';
import { InternalElement } from './InternalElement';

/**
 * Inline SVG. The DOM and PDF targets render the markup as written.
 *
 * Word has no inline SVG: its picture parts hold bitmaps, and SVG markup that
 * reaches a document body is neither a picture nor a paragraph. The DOCX target
 * therefore degrades explicitly instead of leaking the labels of the graphic
 * into the text:
 *
 * - Give the element an `id` and pass a PNG rendering of it to `reactToDocx`
 *   through `svgImages`, and the DOCX gets that image in a paragraph of its own.
 * - Without one, the element renders as nothing and the DOCX target warns once,
 *   naming the `id`.
 *
 * @example
 * <Svg id="logo" width={120} height={40}>…</Svg>
 * reactToDocx(Document, {
 *   fonts,
 *   svgImages: { logo: { data: logoPng, width: 120, height: 40 } },
 * });
 */
export function Svg({
  version = '1.1',
  xmlns = 'http://www.w3.org/2000/svg',
  className,
  style,
  children,
  ...props
}: SVGProps<never>) {
  return (
    <InternalElement
      tagName="svg"
      elementType="htmlraw"
      className={className}
      style={style}
      htmlAttributes={{
        version,
        xmlns,
        ...props,
      }}
    >
      {children}
    </InternalElement>
  );
}
