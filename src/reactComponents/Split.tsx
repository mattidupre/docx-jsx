import type { CSSProperties, ReactNode } from 'react';
import type { VariantName, TypographyOptions } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';
import { Typography } from './Typography';

export type SplitProps = ExtendableProps &
  TypographyOptions & {
    as?: 'div';
    variant?: VariantName;
    left: ReactNode;
    classNameLeft?: string;
    styleLeft?: CSSProperties;
    right: ReactNode;
    classNameRight?: string;
    styleRight?: CSSProperties;
  };

// TODO: If not within a <Document> or if target is web:
// do not encode data set CSS variables on element

export function Split({
  as = 'div',
  variant,
  className,
  style,
  left,
  classNameLeft,
  styleLeft,
  right,
  classNameRight,
  styleRight,
  ...contentOptions
}: SplitProps) {
  return (
    <InternalElement
      tagName={as}
      elementType="split"
      variant={variant}
      className={className}
      style={{
        ...style,
        ...{
          width: '100%',
          display: 'flex',
          columnGap: '0.0625rem',
          justifyContent: 'space-between',
        },
      }}
      typography={contentOptions}
    >
      <Typography as="div" className={classNameLeft} style={styleLeft}>
        {left}
      </Typography>
      <Typography
        as="div"
        className={classNameRight}
        style={styleRight}
        textAlign="right"
      >
        {right}
      </Typography>
    </InternalElement>
  );
}
