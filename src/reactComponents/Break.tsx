import { InternalElement } from './InternalElement';

export type BreakProps = {
  className?: string;
};

export function Break({ className }: BreakProps) {
  return (
    <InternalElement
      className={className}
      tagName="div"
      elementType="break"
      elementOptions={{}}
    />
  );
}
