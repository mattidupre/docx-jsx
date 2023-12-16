import {
  encodeElementData,
  type TextOptions,
  type CounterOptions,
} from '../entities';

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
