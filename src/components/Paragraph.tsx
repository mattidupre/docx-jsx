import { type ElementProps, encodeHtmlDataAttributes } from 'src/entities';

export function Paragraph<TProps extends ElementProps['paragraph']>({
  children,
}: TProps) {
  return (
    <p {...encodeHtmlDataAttributes({ elementType: 'paragraph' })}>
      {children}
    </p>
  );
}
