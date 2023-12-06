import { encodeElementData } from '../entities';
import { type TextOptions, type CounterOptions } from 'src/entities/options.js';

export type CounterProps = {
  text?: TextOptions;
} & CounterOptions;

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
