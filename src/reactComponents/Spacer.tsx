import type { UnitsSize } from '../entities';
import type { ExtendableProps } from './entities';
import { InternalElement } from './InternalElement';

export type SpacerProps = ExtendableProps & {
  height: UnitsSize;
};

/**
 * Vertical space between two blocks.
 *
 * | Target | Rendering |
 * | --- | --- |
 * | HTML / DOM | An empty `<div>` with an explicit `height` and no margins, so nothing collapses into it. |
 * | PDF | The same `<div>`. |
 * | DOCX | An empty `Paragraph` whose `spacing.line` is `height` in whole twips at `LineRuleType.EXACT`, with `spacing.before` and `spacing.after` set to zero. Exact line spacing is the only paragraph height Word does not adjust for the font, so the space measures the same number of twips as the HTML block. |
 *
 * @example
 * <Spacer height="0.5in" />
 */
export function Spacer({ height, className, style }: SpacerProps) {
  return (
    <InternalElement
      tagName="div"
      elementType="spacer"
      elementOptions={{ height }}
      className={className}
      style={{
        height,
        marginTop: 0,
        marginBottom: 0,
        ...style,
      }}
    />
  );
}
