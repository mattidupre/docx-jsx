import type { UnitsSize } from '../entities';
import type { ExtendableProps } from './entities';
import { InternalElement } from './InternalElement';

export type ImageAlign = 'left' | 'center' | 'right';

export type ImageProps = ExtendableProps & {
  /**
   * A path resolved against the `publicDirectory` of the target, an absolute
   * file path, or a `data:` URL.
   */
  src: string;
  alt: string;
  align?: ImageAlign;
} & (
    | { width: UnitsSize; height?: UnitsSize }
    | { width?: UnitsSize; height: UnitsSize }
  );

/**
 * The CSS `margin-left`/`margin-right` pair that aligns a block-level element
 * inside its container. `align` has to reach both targets as the same idea, and
 * Word aligns a picture through the paragraph that holds it rather than through
 * the picture itself.
 */
const ALIGN_MARGINS = {
  left: { marginLeft: 0, marginRight: 'auto' },
  center: { marginLeft: 'auto', marginRight: 'auto' },
  right: { marginLeft: 'auto', marginRight: 0 },
} as const satisfies Record<ImageAlign, Record<string, string | number>>;

/**
 * A raster image.
 *
 * | Target | Rendering |
 * | --- | --- |
 * | HTML / DOM | `<img src alt>` sized with CSS `width`/`height`; the axis that was left out is `auto`, so the browser keeps the aspect ratio. `align` makes the image a block and sets its auto margins. |
 * | PDF | The same `<img>`. `src` is fetched by Chrome, so a non-`data:` path is served from `publicDirectory` (see `reactToPdf`). |
 * | DOCX | An `ImageRun` sized in pixels at 96 DPI, inside a `Paragraph` whose alignment matches `align`. The bytes come from the `data:` URL, or are read from `publicDirectory` (see `reactToDocx`). The axis that was left out is derived from the intrinsic size in the file's header, so the aspect ratio matches the browser's. |
 *
 * At least one of `width` and `height` is required: without one Word has no
 * size to give the picture, and a picture that sizes itself to the page in the
 * browser but not in Word is not the same document.
 *
 * @example
 * <Image src="/logo.png" alt="Logo" width="1.5in" align="center" />
 * reactToDocx(Document, { fonts, publicDirectory });
 */
export function Image({
  src,
  width,
  height,
  alt,
  align,
  className,
  style,
}: ImageProps) {
  if (!width && !height) {
    throw new TypeError(
      `Image "${src}" must be given a width, a height, or both.`,
    );
  }

  return (
    <InternalElement
      tagName="img"
      elementType="image"
      elementOptions={{ src, width, height, alt, align }}
      className={className}
      htmlAttributes={{ src, alt }}
      style={{
        width: width ?? 'auto',
        height: height ?? 'auto',
        ...(align && { display: 'block', ...ALIGN_MARGINS[align] }),
        ...style,
      }}
    />
  );
}
