import { type CounterType } from 'src/entities/primitives';
import { dataToHtmlAttributes } from 'src/entities/tree';

export type CounterProps = {
  type: CounterType;
};

// TODO: Throw if not in headers and footers.

export function Counter({ type: counterType }: CounterProps) {
  return (
    <div
      {...dataToHtmlAttributes({
        elementType: 'counter',
        options: { counterType },
      })}
    />
  );
}
