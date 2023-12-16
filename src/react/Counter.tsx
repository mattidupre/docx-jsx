import {
  encodeElementData,
  type TextOptions,
  type CounterOptions,
} from '../entities';
import { useTarget } from './useTarget';

export type CounterProps = {
  text?: TextOptions;
} & CounterOptions;

// TODO: Throw if not in headers and footers.

export function Counter(props: CounterProps) {
  if (useTarget() === 'web') {
    console.warn('Counter elements will be ignored in web output.');
  }

  return (
    <span
      {...encodeElementData({
        elementType: 'counter',
        elementOptions: props,
        counterType: props.counterType,
      })}
    />
  );
}
