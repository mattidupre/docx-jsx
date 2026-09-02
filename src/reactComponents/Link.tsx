import type { ReactNode } from 'react';
import type { TypographyOptions, VariantName } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type BookmarkProps = ExtendableProps & {
  /** The name a {@link Link} points at. */
  id: string;
  children?: ReactNode;
};

/**
 * A named place in the document a {@link Link} can jump to.
 *
 * Per target:
 * - HTML/DOM/PDF: an `<a id>` around the children, which is what
 *   `<a href="#id">` resolves against and what Chrome's PDF writer turns into a
 *   named destination.
 * - DOCX: a `w:bookmarkStart`/`w:bookmarkEnd` pair around the same runs.
 *
 * @example
 * <h2><Bookmark id="cetology">Cetology</Bookmark></h2>
 * <Link to="#cetology">Back to Cetology</Link>
 */
export function Bookmark({ id, className, style, children }: BookmarkProps) {
  return (
    <InternalElement
      tagName="a"
      elementType="htmltag"
      className={className}
      style={style}
      htmlAttributes={{ id }}
    >
      {children}
    </InternalElement>
  );
}

export type LinkProps = ExtendableProps &
  TypographyOptions & {
    /** An external target, e.g. `https://example.com/` or `mailto:…`. */
    href?: string;
    /** An internal target written as a fragment, e.g. `#cetology`. */
    to?: string;
    /** An internal target written as a {@link Bookmark} id, e.g. `cetology`. */
    bookmark?: string;
    variant?: VariantName;
    children?: ReactNode;
  };

const LINK_TARGET_PROPS = ['href', 'to', 'bookmark'] as const;

/**
 * A hyperlink, either to a URL outside the document or to a {@link Bookmark}
 * inside it. Exactly one of `href`, `to` and `bookmark` names the target.
 *
 * Per target:
 * - HTML/DOM/PDF: an `<a href>`, with an internal target written as `#id`.
 * - DOCX: an `ExternalHyperlink` holding a relationship to the URL, or an
 *   `InternalHyperlink` anchored on the bookmark. Either way its runs carry
 *   Word's built-in `Hyperlink` character style, which is what the `hyperlink`
 *   variant styles in CSS.
 *
 * @example
 * <Link href="https://example.com/">Example</Link>
 * <Link bookmark="cetology">Cetology</Link>
 */
export function Link({
  href,
  to,
  bookmark,
  variant,
  className,
  style,
  children,
  ...contentOptions
}: LinkProps) {
  const targets = LINK_TARGET_PROPS.filter(
    (name) => ({ href, to, bookmark })[name] !== undefined,
  );
  if (targets.length !== 1) {
    throw new TypeError(
      `Link must have exactly one of ${LINK_TARGET_PROPS.join(
        ', ',
      )}, received ${targets.length}.`,
    );
  }
  if (to !== undefined && !to.startsWith('#')) {
    throw new TypeError(
      `Link "to" points inside the document and must begin with "#", received "${to}". Use "href" for an external target.`,
    );
  }
  return (
    <InternalElement
      tagName="a"
      elementType="htmltag"
      variant={variant}
      className={className}
      style={style}
      htmlAttributes={{ href: href ?? to ?? `#${bookmark}` }}
      typography={contentOptions}
    >
      {children}
    </InternalElement>
  );
}
