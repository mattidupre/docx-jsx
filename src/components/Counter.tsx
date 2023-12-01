import {
  encodeElementData,
  type CounterOptions,
} from '../entities/elements.js';

export type CounterProps = CounterOptions;

// TODO: Throw if not in headers and footers.

export function Counter(props: CounterProps) {
  return (
    <span
      {...encodeElementData({
        elementType: 'counter',
        elementOptions: props,
      })}
    />
  );
}
