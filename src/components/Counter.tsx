import { type CounterType } from '../entities/primitives.js';
import { dataToHtmlAttributes } from '../entities/tree.js';

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
