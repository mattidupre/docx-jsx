import { type ElementProps, encodeHtmlDataAttributes } from 'src/entities';

export function Document<TProps extends ElementProps['document']>({
  children,
}: TProps) {
  return (
    <main {...encodeHtmlDataAttributes({ elementType: 'document' })}>
      {children}
    </main>
  );
}
