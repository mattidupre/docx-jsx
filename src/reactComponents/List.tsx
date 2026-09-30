import type { ReactNode } from 'react';
import {
  LIST_FORMAT_OL_TYPES,
  LIST_FORMAT_STYLE_TYPES,
  type ListFormat,
  type TypographyOptions,
  type UnitsSize,
  type VariantName,
} from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type ListProps = ExtendableProps &
  TypographyOptions & {
    /**
     * Whether the list is numbered. Defaults to true when `format` names a
     * numbered marker.
     */
    ordered?: boolean;
    /** The marker drawn beside each item. */
    format?: ListFormat;
    /** The number the first item is given. */
    start?: number;
    /** How far each level is indented past the one above it. */
    indent?: UnitsSize;
    variant?: VariantName;
    children?: ReactNode;
  };

/**
 * A numbered or bulleted list. Nesting a list inside a {@link ListItem} nests
 * the numbering with it, and every list counts from its own `start` rather than
 * continuing the one before it.
 *
 * Per target:
 * - HTML/DOM/PDF: `<ol>` or `<ul>` carrying `list-style-type`, `start` and the
 *   `<ol>` `type` attribute, so a browser and the PDF both draw the markers
 *   the CSS asks for. A list continued on the next page keeps counting.
 * - DOCX: an abstract numbering with nine levels of that format, indent and
 *   start, plus a `w:numPr` on every item paragraph naming it. Lists that draw
 *   the same markers share the definition but never the instance, so their
 *   numbers stay independent.
 *
 * @example
 * <List ordered format="lowerRoman" start={3}>
 *   <ListItem>Third</ListItem>
 *   <ListItem>Fourth</ListItem>
 * </List>
 */
export function List({
  ordered,
  format,
  start = 1,
  indent,
  variant,
  className,
  style,
  children,
  ...contentOptions
}: ListProps) {
  const isOrdered = ordered ?? (format !== undefined && format !== 'bullet');
  const listFormat: ListFormat = format ?? (isOrdered ? 'decimal' : 'bullet');
  const olType = isOrdered ? LIST_FORMAT_OL_TYPES[listFormat] : undefined;
  return (
    <InternalElement
      tagName={isOrdered ? 'ol' : 'ul'}
      elementType="list"
      elementOptions={{ ordered: isOrdered, format: listFormat, start, indent }}
      variant={variant}
      className={className}
      htmlAttributes={{
        // CSS cannot say where a counter starts, so the attribute is what makes
        // a browser agree with Word about the first number.
        ...(isOrdered && start !== 1 && { start }),
        ...(olType && { type: olType }),
      }}
      style={{
        listStyleType: LIST_FORMAT_STYLE_TYPES[listFormat],
        ...(indent && { paddingLeft: indent }),
        ...style,
      }}
      typography={contentOptions}
    >
      {children}
    </InternalElement>
  );
}

export type ListItemProps = ExtendableProps &
  TypographyOptions & {
    variant?: VariantName;
    children?: ReactNode;
  };

/**
 * One item of a {@link List}.
 *
 * Per target:
 * - HTML/DOM/PDF: an `<li>`.
 * - DOCX: a paragraph carrying the list's numbering at the item's depth. A
 *   `variant` keeps its paragraph style; without one the paragraph gets Word's
 *   own `ListParagraph` style, as `docx` writes for any numbered paragraph.
 */
export function ListItem({
  variant,
  className,
  style,
  children,
  ...contentOptions
}: ListItemProps) {
  return (
    <InternalElement
      tagName="li"
      elementType="htmltag"
      variant={variant}
      className={className}
      style={style}
      typography={contentOptions}
    >
      {children}
    </InternalElement>
  );
}
