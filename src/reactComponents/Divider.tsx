import type { Color, UnitsSize } from '../entities';
import type { ExtendableProps } from './entities';
import { InternalElement } from './InternalElement';

export type DividerProps = ExtendableProps & {
  color?: Color;
  thickness?: UnitsSize;
  spaceBefore?: UnitsSize;
  spaceAfter?: UnitsSize;
  /** Percentage of the content width the rule spans. Defaults to the full width. */
  width?: number;
};

export const DEFAULT_DIVIDER_OPTIONS = {
  color: '#000000',
  thickness: '1px',
  spaceBefore: '0.5rem',
  spaceAfter: '0.5rem',
} as const satisfies Partial<DividerProps>;

/**
 * A horizontal rule.
 *
 * | Target | Rendering |
 * | --- | --- |
 * | HTML / DOM | A `<div>` of zero content height carrying `border-top`, with `margin-top`/`margin-bottom` for the spacing. The rule is drawn by the border rather than by `<hr>`, whose thickness, colour and margins are user-agent defaults and differ from Word's. |
 * | PDF | The same `<div>`. |
 * | DOCX | An empty `Paragraph` with a `BorderStyle.SINGLE` bottom border (`size` in eighths of a point, `color` as a six-digit hex) and `spacing.before`/`spacing.after` in twips. Its line height is the thickness of the rule, exactly, so the paragraph occupies the same height as the HTML block instead of a blank line of body text. |
 *
 * `width` is a percentage of the content width: CSS `width` in the browser, a
 * right indent of the remaining width in Word, where a paragraph border always
 * runs from indent to indent.
 *
 * @example
 * <Divider color="#cccccc" thickness="2px" spaceBefore="1rem" spaceAfter="1rem" />
 */
export function Divider({
  color = DEFAULT_DIVIDER_OPTIONS.color,
  thickness = DEFAULT_DIVIDER_OPTIONS.thickness,
  spaceBefore = DEFAULT_DIVIDER_OPTIONS.spaceBefore,
  spaceAfter = DEFAULT_DIVIDER_OPTIONS.spaceAfter,
  width,
  className,
  style,
}: DividerProps) {
  return (
    <InternalElement
      tagName="div"
      elementType="divider"
      elementOptions={{ color, thickness, spaceBefore, spaceAfter, width }}
      className={className}
      style={{
        height: 0,
        borderTopWidth: thickness,
        borderTopStyle: 'solid',
        borderTopColor: color,
        marginTop: spaceBefore,
        marginBottom: spaceAfter,
        ...(width !== undefined && { width: `${width}%` }),
        ...style,
      }}
    />
  );
}
