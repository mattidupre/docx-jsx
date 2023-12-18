import type { CSSProperties } from 'react';
import type { TextOptions, CounterOptions, VariantName } from '../entities';
import { useTarget } from './useTarget';
import { InternalElement } from './InternalElement.js';
import type { ExtendableProps } from './entities.js';

export type CounterProps = ExtendableProps & {
  variant?: VariantName;
  text?: TextOptions;
} & CounterOptions;

export function Counter({
  text,
  variant,
  counterType,
  ...props
}: CounterProps) {
  if (useTarget() === 'web') {
    console.warn('Counter elements will be ignored in web output.');
  }

  return (
    <InternalElement
      tagName="span"
      elementType="counter"
      elementOptions={{ text, variant, counterType }}
      elementAttributes={{
        counterType,
      }}
      style={
        {
          '--temp': 'TEMP',
        } as CSSProperties
      }
      {...props}
    />
  );
}
