import type { CSSProperties, ReactNode } from 'react';
import type { VariantName, TypographyOptions } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';
import { Typography } from './Typography';
import { useEnvironment } from './useEnvironment';

export type TabSplitProps = ExtendableProps &
  TypographyOptions & {
    as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
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

export function TabSplit({
  as = 'p',
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
}: TabSplitProps) {
  const { documentType } = useEnvironment({ disableAssert: true });
  const sep = documentType === 'docx' && (
    <InternalElement
      tagName="span"
      elementType="positionalTab"
      elementOptions={{ alignment: 'right' }}
    />
  );
  return (
    <InternalElement
      tagName={as}
      elementType="htmltag"
      variant={variant}
      className={className}
      style={{
        ...style,
        ...{
          width: '100%',
          display: 'flex',
          columnGap: '0.0625rem',
          flexWrap: 'wrap',
        },
      }}
      typography={contentOptions}
    >
      <Typography as="span" className={classNameLeft} style={styleLeft}>
        {left}
      </Typography>
      {sep}
      <Typography
        as="span"
        className={classNameRight}
        style={styleRight}
        textAlign="right"
      >
        {right}
      </Typography>
    </InternalElement>
  );
}
