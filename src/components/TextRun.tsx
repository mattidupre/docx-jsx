import { type ElementProps, encodeHtmlDataAttributes } from 'src/entities';

export function TextRun<TProps extends ElementProps['textrun']>({
  children,
}: TProps) {
  return (
    <span {...encodeHtmlDataAttributes({ elementType: 'textrun' })}>
      {children}
    </span>
  );
}
