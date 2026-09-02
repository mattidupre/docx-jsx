import type { HTMLAttributes, ReactNode } from 'react';
import type { TagName } from '../entities';
import { InternalElement } from './InternalElement';

export type RawProps<TTagName extends TagName> = HTMLAttributes<TTagName> & {
  as: TTagName;
  children: ReactNode;
};

/**
 * An escape hatch for markup the library has no component for. The subtree is
 * written as authored, under a wrapper of the tag named by `as`, with every
 * other prop passed through as an attribute.
 *
 * The content is not validated, but it is not opaque either: each target still
 * reads the tags inside it.
 *
 * - The DOM and PDF targets render the markup as written. It inherits the
 *   library's stylesheet like any other element, so a `<p>` inside a `Raw` is
 *   styled by the same rules as a `Typography as="p"`.
 * - The DOCX target maps the text through the standard tag handling rather than
 *   dropping it: `<p>`, `<h1>`..`<h6>` and `<li>` become paragraphs and list
 *   items, `<b>`/`<em>`/`<u>`/`<s>`/`<sup>`/`<sub>` become run properties, and
 *   `<a>` becomes a hyperlink. Text with no block tag of its own is gathered
 *   into a paragraph rather than written at section level, which Word reads as
 *   a corrupt document. A tag Word has no equivalent for contributes its
 *   children and nothing else.
 *
 * Layout written as raw CSS -- floats, flex, grid, positioning -- reaches only
 * the browser targets. Use `Grid`, `Split` or `Stack` for anything that has to
 * lay out the same way in Word.
 *
 * @example
 * <Raw as="section" aria-label="Notes">
 *   <h3>Notes</h3>
 *   <p>Body <b>text</b>.</p>
 * </Raw>
 */
export function Raw<TTagName extends TagName>({
  as,
  children,
  className,
  style,
  ...props
}: RawProps<TTagName>) {
  return (
    <InternalElement
      tagName={as}
      elementType="htmlraw"
      className={className}
      style={style}
      htmlAttributes={props}
    >
      {children}
    </InternalElement>
  );
}
