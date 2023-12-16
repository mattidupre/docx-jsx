import type { TextOptions, CounterOptions } from '../entities';
import { useTarget } from './useTarget';
import { InternalElement } from './InternalElement.js';
import type { ExtendableProps } from './entities.js';

export type CounterProps = ExtendableProps & {
  text?: TextOptions;
} & CounterOptions;

export function Counter({ text, counterType, ...props }: CounterProps) {
  if (useTarget() === 'web') {
    console.warn('Counter elements will be ignored in web output.');
  }

  return (
    <InternalElement
      tagName="span"
      elementType="counter"
      elementOptions={{ text, counterType }}
      elementAttributes={{
        counterType,
      }}
      {...props}
    />
  );
}
